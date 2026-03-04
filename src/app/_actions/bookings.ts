'use server'

import { ApprovalStatus, BookingType } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'
import { sendBookingStatusEmail } from './email/email-bookings'
import { revalidateTag } from 'next/cache'

export type BookingListItem = {
    id: string
    bookingReference: string
    startDate: string
    endDate: string
    dailyTimeStart?: string | null
    dailyTimeEnd?: string | null
    bookingType: string
    clientStatus: string
    approvalStatus: ApprovalStatus
    submittedAt: string
    approvalDate?: string | null
    cancellationDeadline?: string | null
    message?: string | null
    attendeeCount?: number | null
    building: { name: string }
    room: { name: string }
    submittedBy: { name: string | null; email: string; companyName?: string | null }
    updatedBy?: { id: string; name?: string | null } | null
}

export type BookingRow = BookingListItem & {
    _display: {
        dateRange: string
        timeRange: string
        submittedAt: string
        approvalDate: string
        cancellationDeadline: string
        startDateForExport: string
        endDateForExport: string
        startTimeForExport: string
        endTimeForExport: string
        startYear: number | null
        startMonth: number | null
    }
}

interface GetBookingsResult {
    success: boolean
    data?: BookingListItem[]
    page?: number
    pageSize?: number
    totalCount?: number
    totalPages?: number
    error?: string
}

interface GetBookingsInput {
    page?: number
    pageSize?: number
}

const BOOKINGS_CACHE_TTL_SECONDS = 300
const BOOKINGS_CACHE_VERSION_KEY = 'bookings:list:version'

function getBookingsCacheKey(page: number, pageSize: number, version: number): string {
    return `bookings:list:v${version}:page:${page}:size:${pageSize}`
}

async function getBookingsCacheVersion(): Promise<number> {
    if (!redis) {
        return 0
    }

    try {
        const version = await redis.get<number>(BOOKINGS_CACHE_VERSION_KEY)
        return typeof version === 'number' && Number.isFinite(version) ? version : 0
    } catch (error) {
        console.error('Get bookings cache version error:', error)
        return 0
    }
}

async function invalidateBookingsCache(): Promise<void> {
    if (!redis) {
        return
    }

    try {
        await redis.incr(BOOKINGS_CACHE_VERSION_KEY)
    } catch (error) {
        console.error('Invalidate bookings cache error:', error)
    }
}

interface UpdateBookingApprovalResult {
    success: boolean
    data?: {
        id: string
        approvalStatus: ApprovalStatus
        updatedById: string | null
    }
    error?: string
}

interface CreateWalkInBookingResult {
    success: boolean
    data?: {
        id: string
        bookingReference: string
        approvalStatus: ApprovalStatus
    }
    error?: string
}

interface CreateWalkInBookingInput {
    email: string
    name: string
    phoneNumber?: string
    companyName?: string
    buildingId: string
    roomId: string
    bookingType: 'HOURLY' | 'DAILY'
    startDate: Date
    endDate: Date
    dailyTimeStart?: Date
    dailyTimeEnd?: Date
    attendeeCount?: number
    message?: string
}

type ConflictCheckBooking = {
    id: string
    bookingReference: string
    bookingType: BookingType
    startDate: Date
    endDate: Date
    dailyTimeStart: Date | null
    dailyTimeEnd: Date | null
}

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

const MANILA_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
})

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? ''
}

function toManilaDateKey(date: Date): string {
    const parts = MANILA_DATE_FORMATTER.formatToParts(date)
    const year = getPartValue(parts, 'year')
    const month = getPartValue(parts, 'month')
    const day = getPartValue(parts, 'day')
    return `${year}-${month}-${day}`
}

function toManilaMinutes(date: Date): number {
    const parts = MANILA_TIME_FORMATTER.formatToParts(date)
    const hour = Number(getPartValue(parts, 'hour'))
    const minute = Number(getPartValue(parts, 'minute'))
    return (hour * 60) + minute
}

function toDailyWallClockMinutes(date: Date): number {
    return (date.getUTCHours() * 60) + date.getUTCMinutes()
}

function dateKeyToOrdinal(dateKey: string): number {
    const [year, month, day] = dateKey.split('-').map(Number)
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function rangesOverlapExclusive(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && startB < endA
}

function rangesOverlapInclusive(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA <= endB && startB <= endA
}

function hasScheduleConflict(
    input: CreateWalkInBookingInput,
    existingBooking: ConflictCheckBooking
): boolean {
    const requestIsDaily = input.bookingType === 'DAILY'
    const existingIsDaily = existingBooking.bookingType === 'DAILY'

    if (!requestIsDaily && !existingIsDaily) {
        return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
    }

    const requestStartDay = dateKeyToOrdinal(toManilaDateKey(input.startDate))
    const requestEndDay = dateKeyToOrdinal(toManilaDateKey(input.endDate))
    const existingStartDay = dateKeyToOrdinal(toManilaDateKey(existingBooking.startDate))
    const existingEndDay = dateKeyToOrdinal(toManilaDateKey(existingBooking.endDate))

    if (!rangesOverlapInclusive(requestStartDay, requestEndDay, existingStartDay, existingEndDay)) {
        return false
    }

    if (requestIsDaily && existingIsDaily) {
        if (!input.dailyTimeStart || !input.dailyTimeEnd || !existingBooking.dailyTimeStart || !existingBooking.dailyTimeEnd) {
            return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
        }

        const requestStartMinutes = toDailyWallClockMinutes(input.dailyTimeStart)
        const requestEndMinutes = toDailyWallClockMinutes(input.dailyTimeEnd)
        const existingStartMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeStart)
        const existingEndMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeEnd)

        return rangesOverlapExclusive(requestStartMinutes, requestEndMinutes, existingStartMinutes, existingEndMinutes)
    }

    if (requestIsDaily && !existingIsDaily) {
        if (!input.dailyTimeStart || !input.dailyTimeEnd) {
            return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
        }

        const requestStartMinutes = toDailyWallClockMinutes(input.dailyTimeStart)
        const requestEndMinutes = toDailyWallClockMinutes(input.dailyTimeEnd)
        const existingStartMinutes = toManilaMinutes(existingBooking.startDate)
        const existingEndMinutes = toManilaMinutes(existingBooking.endDate)

        return rangesOverlapExclusive(requestStartMinutes, requestEndMinutes, existingStartMinutes, existingEndMinutes)
    }

    if (!existingBooking.dailyTimeStart || !existingBooking.dailyTimeEnd) {
        return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
    }

    const requestStartMinutes = toManilaMinutes(input.startDate)
    const requestEndMinutes = toManilaMinutes(input.endDate)
    const existingStartMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeStart)
    const existingEndMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeEnd)

    return rangesOverlapExclusive(requestStartMinutes, requestEndMinutes, existingStartMinutes, existingEndMinutes)
}

export type Building = {
    id: string
    buildingName: string
    buildingCode: string
    status: string
}

export type Room = {
    id: string
    roomName: string
    roomCode: string | null
    capacity: number
    status: string
    buildingId: string
}

interface GetBuildingsResult {
    success: boolean
    data?: Building[]
    error?: string
}

interface GetRoomsResult {
    success: boolean
    data?: Room[]
    error?: string
}

interface GetRoomsByBuildingInput {
    buildingId: string
}

export type RoomUnavailableSlot = {
    date: string
    startTime: string
    endTime: string
    startMinute: number
    endMinute: number
    bookingReference: string
    bookingType: BookingType
}

interface GetRoomUnavailableSlotsInput {
    roomId: string
    dateStart: string
    dateEnd?: string
}

interface GetRoomUnavailableSlotsResult {
    success: boolean
    data?: RoomUnavailableSlot[]
    error?: string
}

const MANILA_AMPM_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
})

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return null
    }

    const [year, month, day] = dateKey.split('-').map(Number)
    if (!year || !month || !day) {
        return null
    }

    return { year, month, day }
}

function formatMinutesAsLabel(minutes: number): string {
    if (minutes >= 24 * 60) {
        return '11:59 PM'
    }

    const safeMinutes = Math.max(0, minutes)
    const hour = Math.floor(safeMinutes / 60)
    const minute = safeMinutes % 60
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`
}

function formatManilaTimeLabel(date: Date): string {
    return MANILA_AMPM_TIME_FORMATTER.format(date)
}

function formatDailyWallClockLabel(date: Date): string {
    return formatMinutesAsLabel(toDailyWallClockMinutes(date))
}

function ordinalToDateKey(ordinal: number): string {
    return toManilaDateKey(new Date(ordinal * 86400000))
}

function getBookingSlotsForDateRange(
    booking: ConflictCheckBooking,
    requestStartOrdinal: number,
    requestEndOrdinal: number
): RoomUnavailableSlot[] {
    const slots: RoomUnavailableSlot[] = []
    const bookingStartOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.startDate))
    const bookingEndOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.endDate))

    const startOrdinal = Math.max(requestStartOrdinal, bookingStartOrdinal)
    const endOrdinal = Math.min(requestEndOrdinal, bookingEndOrdinal)

    if (startOrdinal > endOrdinal) {
        return slots
    }

    if (booking.bookingType === 'DAILY' && booking.dailyTimeStart && booking.dailyTimeEnd) {
        const startMinute = toDailyWallClockMinutes(booking.dailyTimeStart)
        const endMinute = toDailyWallClockMinutes(booking.dailyTimeEnd)
        const startTimeLabel = formatDailyWallClockLabel(booking.dailyTimeStart)
        const endTimeLabel = formatDailyWallClockLabel(booking.dailyTimeEnd)

        for (let day = startOrdinal; day <= endOrdinal; day += 1) {
            slots.push({
                date: ordinalToDateKey(day),
                startTime: startTimeLabel,
                endTime: endTimeLabel,
                startMinute,
                endMinute,
                bookingReference: booking.bookingReference,
                bookingType: booking.bookingType,
            })
        }

        return slots
    }

    const bookingStartMinute = toManilaMinutes(booking.startDate)
    const bookingEndMinute = toManilaMinutes(booking.endDate)

    for (let day = startOrdinal; day <= endOrdinal; day += 1) {
        const isFirstDay = day === bookingStartOrdinal
        const isLastDay = day === bookingEndOrdinal

        const startMinutes = isFirstDay ? bookingStartMinute : 0
        const endMinutes = isLastDay ? bookingEndMinute : 24 * 60

        if (startMinutes >= endMinutes) {
            continue
        }

        slots.push({
            date: ordinalToDateKey(day),
            startTime: formatMinutesAsLabel(startMinutes),
            endTime: formatMinutesAsLabel(endMinutes),
            startMinute: startMinutes,
            endMinute: endMinutes,
            bookingReference: booking.bookingReference,
            bookingType: booking.bookingType,
        })
    }

    return slots
}

function formatDateManilaShort(dt: Date): string {
    return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
    })
}

function formatTimeLabel(dt: Date, timeZone: string): string {
    return dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
    })
}

function formatDateTimeManila(dt: Date): string {
    return dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    })
}

function formatDateRangeManila(start: Date, end: Date): string {
    const startText = formatDateManilaShort(start)
    const endText = formatDateManilaShort(end)
    if (startText === endText) return startText

    const startYear = start.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Manila' })
    const endYear = end.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Manila' })
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Manila' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Manila' })

    if (startYear === endYear && startMonth === endMonth) {
        const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' })
        const endDay = end.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' })
        return `${startMonth} ${startDay} - ${endDay}, ${startYear}`
    }

    if (startYear === endYear) {
        const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' })
        return `${startMonth} ${startDay} - ${endText}`
    }

    return `${startText} - ${endText}`
}

export async function getBookingsCached(input: GetBookingsInput = {}): Promise<GetBookingsResult> {
    return getBookings(input)
}

export async function getBookings(input: GetBookingsInput = {}): Promise<GetBookingsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const page = Math.max(1, input.page ?? 1)
        const pageSize = Math.max(1, Math.min(10, input.pageSize ?? 10))
        const skip = (page - 1) * pageSize

        const cacheVersion = await getBookingsCacheVersion()
        const cacheKey = getBookingsCacheKey(page, pageSize, cacheVersion)

        if (redis) {
            try {
                const cached = await redis.get<GetBookingsResult>(cacheKey)
                if (cached?.success) {
                    return cached
                }
            } catch (error) {
                console.error('Get bookings cache read error:', error)
            }
        }

        const where = {
            isActive: true,
            deletedAt: null,
        }

        const [totalCount, bookings] = await prisma.$transaction([
            prisma.booking.count({ where }),
            prisma.booking.findMany({
                where,
                select: {
                    id: true,
                    bookingReference: true,
                    startDate: true,
                    endDate: true,
                    dailyTimeStart: true,
                    dailyTimeEnd: true,
                    bookingType: true,
                    clientStatus: true,
                    approvalStatus: true,
                    submittedAt: true,
                    approvalDate: true,
                    cancellationDeadline: true,
                    message: true,
                    attendeeCount: true,
                    building: { select: { buildingName: true } },
                    room: { select: { roomName: true } },
                    submittedBy: { select: { name: true, email: true, companyName: true } },
                    updatedBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
        ])

        const formatted: BookingRow[] = bookings.map((booking) => {
            const startYear = booking.startDate ? booking.startDate.getFullYear() : null
            const startMonth = booking.startDate ? booking.startDate.getMonth() + 1 : null

            const dateRange = booking.startDate && booking.endDate
                ? formatDateRangeManila(booking.startDate, booking.endDate)
                : (booking.startDate?.toISOString() || '-')

            const startTimeBase = booking.dailyTimeStart || booking.startDate
            const endTimeBase = booking.dailyTimeEnd || booking.endDate
            const startTimeTz = booking.dailyTimeStart ? 'UTC' : 'Asia/Manila'
            const endTimeTz = booking.dailyTimeEnd ? 'UTC' : 'Asia/Manila'
            const startTimeLabel = startTimeBase ? formatTimeLabel(startTimeBase, startTimeTz) : '--:--'
            const endTimeLabel = endTimeBase ? formatTimeLabel(endTimeBase, endTimeTz) : '--:--'

            return {
                id: booking.id,
                bookingReference: booking.bookingReference,
                startDate: booking.startDate.toISOString(),
                endDate: booking.endDate.toISOString(),
                dailyTimeStart: booking.dailyTimeStart ? booking.dailyTimeStart.toISOString() : null,
                dailyTimeEnd: booking.dailyTimeEnd ? booking.dailyTimeEnd.toISOString() : null,
                bookingType: booking.bookingType,
                clientStatus: booking.clientStatus,
                approvalStatus: booking.approvalStatus,
                submittedAt: booking.submittedAt.toISOString(),
                approvalDate: booking.approvalDate ? booking.approvalDate.toISOString() : null,
                cancellationDeadline: booking.cancellationDeadline ? booking.cancellationDeadline.toISOString() : null,
                message: booking.message,
                attendeeCount: booking.attendeeCount,
                building: { name: booking.building.buildingName },
                room: { name: booking.room.roomName },
                submittedBy: {
                    name: booking.submittedBy.name,
                    email: booking.submittedBy.email,
                    companyName: booking.submittedBy.companyName,
                },
                updatedBy: booking.updatedBy ? { id: booking.updatedBy.id, name: booking.updatedBy.name } : null,
                _display: {
                    dateRange,
                    timeRange: `${startTimeLabel} - ${endTimeLabel}`,
                    submittedAt: booking.submittedAt ? formatDateTimeManila(booking.submittedAt) : '-',
                    approvalDate: booking.approvalDate ? formatDateTimeManila(booking.approvalDate) : '-',
                    cancellationDeadline: booking.cancellationDeadline ? formatDateTimeManila(booking.cancellationDeadline) : '-',
                    startDateForExport: formatDateManilaShort(booking.startDate),
                    endDateForExport: formatDateManilaShort(booking.endDate),
                    startTimeForExport: startTimeBase ? formatTimeLabel(startTimeBase, startTimeTz) : '--:--',
                    endTimeForExport: endTimeBase ? formatTimeLabel(endTimeBase, endTimeTz) : '--:--',
                    startYear,
                    startMonth,
                },
            }
        })

        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

        const response: GetBookingsResult = {
            success: true,
            data: formatted,
            page,
            pageSize,
            totalCount,
            totalPages,
        }

        if (redis) {
            try {
                await redis.set(cacheKey, response, { ex: BOOKINGS_CACHE_TTL_SECONDS })
            } catch (error) {
                console.error('Get bookings cache write error:', error)
            }
        }

        return response
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch bookings.'
        console.error('Get bookings error:', message)
        return { success: false, error: message }
    }
}

export async function getBuildings(): Promise<GetBuildingsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const buildings = await prisma.building.findMany({
            where: { 
                deletedAt: null,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                buildingName: true,
                buildingCode: true,
                status: true
            },
            orderBy: { buildingName: 'asc' }
        })

        return {
            success: true,
            data: buildings
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch buildings.'
        console.error('Get buildings error:', message)
        return { success: false, error: message }
    }
}

export async function getRoomsByBuilding(input: GetRoomsByBuildingInput): Promise<GetRoomsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const { buildingId } = input

        if (!buildingId?.trim()) {
            return { success: false, error: 'Building ID is required.' }
        }

        const rooms = await prisma.room.findMany({
            where: { 
                buildingId,
                deletedAt: null,
                status: 'AVAILABLE'
            },
            select: {
                id: true,
                roomName: true,
                roomCode: true,
                capacity: true,
                status: true,
                buildingId: true
            },
            orderBy: { roomName: 'asc' }
        })

        return {
            success: true,
            data: rooms
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch rooms.'
        console.error('Get rooms error:', message)
        return { success: false, error: message }
    }
}

export async function createWalkInBooking(input: CreateWalkInBookingInput): Promise<CreateWalkInBookingResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const {
            email,
            name,
            phoneNumber,
            companyName,
            buildingId,
            roomId,
            bookingType,
            startDate,
            endDate,
            dailyTimeStart,
            dailyTimeEnd,
            attendeeCount,
            message,
        } = input

        if (!email?.trim() || !name?.trim()) {
            return { success: false, error: 'Client email and name are required.' }
        }

        if (!buildingId?.trim() || !roomId?.trim()) {
            return { success: false, error: 'Building and room are required.' }
        }

        if (!startDate || !endDate) {
            return { success: false, error: 'Start and end dates are required.' }
        }

        if (startDate >= endDate) {
            return { success: false, error: 'End date must be after start date.' }
        }

        if (bookingType !== 'HOURLY' && bookingType !== 'DAILY') {
            return { success: false, error: 'Invalid booking type.' }
        }

        if (bookingType === 'DAILY') {
            if (!dailyTimeStart || !dailyTimeEnd) {
                return { success: false, error: 'Daily booking requires start and end times.' }
            }

            if (dailyTimeStart >= dailyTimeEnd) {
                return { success: false, error: 'Daily end time must be after start time.' }
            }
        }

        // Check if building and room exist
        const [building, room, overlappingBookings] = await Promise.all([
            prisma.building.findFirst({
                where: { id: buildingId, deletedAt: null },
                select: { id: true, buildingName: true }
            }),
            prisma.room.findFirst({
                where: { id: roomId, buildingId, deletedAt: null },
                select: { id: true, roomName: true, capacity: true }
            }),
            prisma.booking.findMany({
                where: {
                    roomId,
                    isActive: true,
                    deletedAt: null,
                    approvalStatus: { in: ['PENDING', 'APPROVED'] },
                    startDate: { lt: endDate },
                    endDate: { gt: startDate },
                },
                select: {
                    id: true,
                    bookingReference: true,
                    bookingType: true,
                    startDate: true,
                    endDate: true,
                    dailyTimeStart: true,
                    dailyTimeEnd: true,
                },
                orderBy: { startDate: 'asc' },
            }),
        ])

        if (!building) {
            return { success: false, error: 'Building not found.' }
        }

        if (!room) {
            return { success: false, error: 'Room not found in the specified building.' }
        }

        if (attendeeCount && attendeeCount > room.capacity) {
            return {
                success: false,
                error: `Attendee count exceeds room capacity (${room.capacity}).`,
            }
        }

        const conflictingBooking = overlappingBookings.find((booking) =>
            hasScheduleConflict(input, booking)
        )

        if (conflictingBooking) {
            return {
                success: false,
                error: `Selected schedule conflicts with existing booking ${conflictingBooking.bookingReference}.`,
            }
        }

        // Generate booking reference
        const bookingRef = `WALK-${Date.now()}`

        // Create or find user
        let user = await prisma.user.findFirst({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, name: true, email: true, emailVerified: true }
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase().trim(),
                    name: name.trim(),
                    phoneNumber: phoneNumber?.trim() || null,
                    companyName: companyName?.trim() || null,
                    emailVerified: false, // Walk-in clients have unverified emails by default
                },
                select: { id: true, name: true, email: true, emailVerified: true }
            })
        } else {
            const userUpdateData: {
                name: string
                phoneNumber?: string | null
                companyName?: string | null
            } = {
                name: name.trim(),
            }

            if (typeof phoneNumber === 'string') {
                userUpdateData.phoneNumber = phoneNumber.trim() || null
            }

            if (typeof companyName === 'string') {
                userUpdateData.companyName = companyName.trim() || null
            }

            await prisma.user.update({
                where: { id: user.id },
                data: userUpdateData,
            })
        }

        // Create booking with PENDING status
        const newBooking = await prisma.booking.create({
            data: {
                bookingReference: bookingRef,
                submittedById: user.id,
                buildingId,
                roomId,
                startDate,
                endDate,
                dailyTimeStart: bookingType === 'DAILY' ? dailyTimeStart : null,
                dailyTimeEnd: bookingType === 'DAILY' ? dailyTimeEnd : null,
                bookingType,
                clientStatus: 'SUBMITTED',
                approvalStatus: 'APPROVED', // Start as APPROVED, admin can change status later
                submittedAt: new Date(),
                updatedById: session.user.id,
                attendeeCount: attendeeCount ?? null,
                message: message?.trim() || null,
                isActive: true
            },
            include: {
                submittedBy: {
                    select: { email: true, name: true },
                },
                building: { select: { buildingName: true } },
                room: { select: { roomName: true } },
            },
        })

        await invalidateBookingsCache()
        revalidateTag('bookings', 'max')

        return {
            success: true,
            data: {
                id: newBooking.id,
                bookingReference: newBooking.bookingReference,
                approvalStatus: newBooking.approvalStatus,
            },
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create walk-in booking.'
        console.error('Create walk-in booking error:', message)
        return { success: false, error: message }
    }
}

export async function updateBookingApprovalStatus(
    bookingId: string,
    approvalStatus: ApprovalStatus,
    message?: string
): Promise<UpdateBookingApprovalResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized.' }
        }

        if (!bookingId?.trim()) {
            return { success: false, error: 'Booking ID is required.' }
        }

        if (approvalStatus !== 'APPROVED' && approvalStatus !== 'REJECTED' && approvalStatus !== 'PENDING') {
            return { success: false, error: 'Invalid approval status.' }
        }

        const updatedBooking = await prisma.booking.update({
            where: { 
                id: bookingId,
                deletedAt: null 
            },
            data: {
                approvalStatus,
                updatedById: session.user.id,
                approvalDate: new Date(),
                ...(typeof message === 'string' ? { message: message.trim() || null } : {}),
            },
            include: {
                submittedBy: {
                    select: { email: true, name: true },
                },
                building: { select: { buildingName: true } },
                room: { select: { roomName: true } },
            },
        })

        if (updatedBooking.submittedBy?.email) {
            await sendBookingStatusEmail({
                to: updatedBooking.submittedBy.email,
                name: updatedBooking.submittedBy.name,
                bookingReference: updatedBooking.bookingReference,
                approved: approvalStatus === 'APPROVED',
                adminMessage: message,
                startDate: updatedBooking.startDate.toLocaleDateString(),
                endDate: updatedBooking.endDate.toLocaleDateString(),
                dailyTimeStart: updatedBooking.dailyTimeStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dailyTimeEnd: updatedBooking.dailyTimeEnd?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                buildingName: updatedBooking.building.buildingName,
                roomName: updatedBooking.room.roomName,
            })
        }

        await invalidateBookingsCache()
        revalidateTag('bookings', 'max')

        return {
            success: true,
            data: {
                id: updatedBooking.id,
                approvalStatus: updatedBooking.approvalStatus,
                updatedById: updatedBooking.updatedById,
            },
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update booking status.'
        console.error('Update booking approval error:', message)
        return { success: false, error: message }
    }
}

export async function getRoomUnavailableSlots(
    input: GetRoomUnavailableSlotsInput
): Promise<GetRoomUnavailableSlotsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const roomId = input.roomId?.trim()
        const startKey = input.dateStart?.trim()
        const endKey = (input.dateEnd || input.dateStart)?.trim()

        if (!roomId) {
            return { success: false, error: 'Room ID is required.' }
        }

        if (!startKey || !endKey) {
            return { success: false, error: 'Date range is required.' }
        }

        if (!parseDateKey(startKey) || !parseDateKey(endKey)) {
            return { success: false, error: 'Invalid date format. Expected YYYY-MM-DD.' }
        }

        const startOrdinal = dateKeyToOrdinal(startKey)
        const endOrdinal = dateKeyToOrdinal(endKey)

        if (startOrdinal > endOrdinal) {
            return { success: false, error: 'End date must be on or after start date.' }
        }

        // Explicitly use Manila timezone (UTC+8) for consistency
        const queryStart = new Date(`${startKey}T00:00:00+08:00`)
        const queryEnd = new Date(`${endKey}T23:59:59.999+08:00`)

        const overlappingBookings = await prisma.booking.findMany({
            where: {
                roomId,
                isActive: true,
                deletedAt: null,
                approvalStatus: { in: ['PENDING', 'APPROVED'] },
                startDate: { lte: queryEnd },
                endDate: { gte: queryStart },
            },
            select: {
                id: true,
                bookingReference: true,
                bookingType: true,
                startDate: true,
                endDate: true,
                dailyTimeStart: true,
                dailyTimeEnd: true,
            },
            orderBy: { startDate: 'asc' },
        })

        const slots = overlappingBookings.flatMap((booking) =>
            getBookingSlotsForDateRange(booking, startOrdinal, endOrdinal)
        )

        return {
            success: true,
            data: slots,
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch unavailable slots.'
        console.error('Get room unavailable slots error:', message)
        return { success: false, error: message }
    }
}
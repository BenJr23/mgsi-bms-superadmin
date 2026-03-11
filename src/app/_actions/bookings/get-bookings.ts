import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'
import { getServerSession } from '@/lib/get-server'
import { BOOKINGS_CACHE_TTL_SECONDS, getBookingsCacheKey, getBookingsCacheVersion } from './cache'
import { formatDateManilaShort, formatDateRangeManila, formatDateTimeManila, formatTimeLabel } from './date-time'
import type { BookingRow, GetBookingsInput, GetBookingsResult } from './types'

type WalkInCustomerProjection = {
    name: string
    email: string
    companyName: string | null
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
        const companyId = input.companyId?.trim()
        const buildingId = input.buildingId?.trim()
        const roomId = input.roomId?.trim()
        const status = input.status?.trim()
        const query = input.query?.trim()

        const cacheVersion = await getBookingsCacheVersion()
        const cacheKey = getBookingsCacheKey(
            page,
            pageSize,
            cacheVersion,
            companyId,
            buildingId,
            roomId,
            status,
            query
        )

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

        const where: any = {
            isActive: true,
            deletedAt: null,
            ...(status && status !== 'ALL' ? { approvalStatus: status } : {}),
            ...(companyId && { submittedBy: { company: { name: { equals: companyId, mode: 'insensitive' } } } }),
            ...(buildingId && { buildingId: { equals: buildingId } }),
            ...(roomId && { roomId: { equals: roomId } }),
            ...(query
                ? {
                    OR: [
                        { bookingReference: { contains: query, mode: 'insensitive' } },
                        { submittedBy: { name: { contains: query, mode: 'insensitive' } } },
                        { submittedBy: { email: { contains: query, mode: 'insensitive' } } },
                        { walkInCustomer: { name: { contains: query, mode: 'insensitive' } } },
                        { walkInCustomer: { email: { contains: query, mode: 'insensitive' } } },
                        { walkInCustomer: { companyName: { contains: query, mode: 'insensitive' } } },
                        { room: { roomName: { contains: query, mode: 'insensitive' } } },
                        { building: { buildingName: { contains: query, mode: 'insensitive' } } },
                    ],
                }
                : {}),
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
                    submittedBy: { select: { name: true, email: true, company: { select: { name: true } } } },
                    walkInCustomer: {
                        select: {
                            name: true,
                            email: true,
                            companyName: true,
                        },
                    },
                    updatedBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
        ])

        const formatted: BookingRow[] = bookings.map((booking) => {
            const displayClient: WalkInCustomerProjection = booking.walkInCustomer
                ? {
                    name: booking.walkInCustomer.name,
                    email: booking.walkInCustomer.email,
                    companyName: booking.walkInCustomer.companyName,
                }
                : {
                    name: booking.submittedBy.name || booking.submittedBy.email,
                    email: booking.submittedBy.email,
                    companyName: booking.submittedBy.company?.name || null,
                }

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
                isWalkIn: Boolean(booking.walkInCustomer),
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
                    name: displayClient.name,
                    email: displayClient.email,
                    companyName: displayClient.companyName,
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
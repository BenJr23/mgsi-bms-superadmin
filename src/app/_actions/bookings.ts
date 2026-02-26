'use server'

import { ApprovalStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { sendBookingStatusEmail } from './email'

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
    buildingId: string
    roomId: string
    startDate: Date
    endDate: Date
    attendeeCount: number
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

export async function getBookings(input: GetBookingsInput = {}): Promise<GetBookingsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const page = Math.max(1, input.page ?? 1)
        const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 10))
        const skip = (page - 1) * pageSize

        const where = {
            isActive: true,
            deletedAt: null,
        }

        const [totalCount, bookings] = await prisma.$transaction([
            prisma.booking.count({ where }),
            prisma.booking.findMany({
                where,
                include: {
                    building: { select: { buildingName: true } },
                    room: { select: { roomName: true } },
                    submittedBy: {
                        select: { name: true, email: true, companyName: true },
                    },
                    updatedBy: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
        ])

        const formatted: BookingListItem[] = bookings.map((booking) => ({
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
            cancellationDeadline: booking.cancellationDeadline
                ? booking.cancellationDeadline.toISOString()
                : null,
            message: booking.message,
            attendeeCount: booking.attendeeCount,
            building: { name: booking.building.buildingName },
            room: { name: booking.room.roomName },
            submittedBy: {
                name: booking.submittedBy.name,
                email: booking.submittedBy.email,
                companyName: booking.submittedBy.companyName,
            },
            updatedBy: booking.updatedBy
                ? { id: booking.updatedBy.id, name: booking.updatedBy.name }
                : null,
        }))

        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

        return {
            success: true,
            data: formatted,
            page,
            pageSize,
            totalCount,
            totalPages,
        }
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

        const { email, name, buildingId, roomId, startDate, endDate, attendeeCount } = input

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

        // Check if building and room exist
        const [building, room] = await Promise.all([
            prisma.building.findFirst({
                where: { id: buildingId, deletedAt: null },
                select: { id: true, buildingName: true }
            }),
            prisma.room.findFirst({
                where: { id: roomId, buildingId, deletedAt: null },
                select: { id: true, roomName: true }
            })
        ])

        if (!building) {
            return { success: false, error: 'Building not found.' }
        }

        if (!room) {
            return { success: false, error: 'Room not found in the specified building.' }
        }

        // Generate booking reference
        const bookingRef = `WALK-${Date.now()}`

        // Create or find user
        let user = await prisma.user.findFirst({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, name: true, email: true, emailVerified: true }
        })

        const isEmailVerified = user?.emailVerified || false
        const isWalkIn = !user || !isEmailVerified

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase().trim(),
                    name: name.trim(),
                    emailVerified: false, // Walk-in clients have unverified emails by default
                },
                select: { id: true, name: true, email: true, emailVerified: true }
            })
        }

        // Create booking with APPROVED status for walk-ins
        const newBooking = await prisma.booking.create({
            data: {
                bookingReference: bookingRef,
                submittedById: user.id,
                buildingId,
                roomId,
                startDate,
                endDate,
                bookingType: 'HOURLY', // Using HOURLY as default booking type
                clientStatus: 'SUBMITTED', // Using SUBMITTED as default client status
                approvalStatus: 'APPROVED', // Auto-approve walk-in bookings
                submittedAt: new Date(),
                approvalDate: new Date(),
                updatedById: session.user.id,
                attendeeCount,
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

        // Send approval email
        if (newBooking.submittedBy?.email) {
            await sendBookingStatusEmail({
                to: newBooking.submittedBy.email,
                name: newBooking.submittedBy.name,
                bookingReference: newBooking.bookingReference,
                approved: true,
                adminMessage: 'Walk-in booking automatically approved.',
                startDate: newBooking.startDate.toLocaleDateString(),
                endDate: newBooking.endDate.toLocaleDateString(),
                dailyTimeStart: newBooking.dailyTimeStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dailyTimeEnd: newBooking.dailyTimeEnd?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                buildingName: newBooking.building.buildingName,
                roomName: newBooking.room.roomName,
            })
        }

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

        if (approvalStatus !== 'APPROVED' && approvalStatus !== 'REJECTED') {
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
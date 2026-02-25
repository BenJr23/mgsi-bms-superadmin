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
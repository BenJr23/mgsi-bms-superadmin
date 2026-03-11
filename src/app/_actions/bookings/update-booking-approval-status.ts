import { revalidateTag } from 'next/cache'
import type { ApprovalStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { sendBookingStatusEmail } from '../email/email-bookings'
import { invalidateBookingsCache } from './cache'
import type { UpdateBookingApprovalResult } from './types'

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
                deletedAt: null,
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
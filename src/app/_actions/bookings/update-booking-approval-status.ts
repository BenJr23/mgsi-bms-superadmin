import { revalidateTag } from 'next/cache'
import type { ApprovalStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { invalidateCompaniesStatsCache, notifyRepresentativeIfCreditsLow } from '../companies'
import { sendBookingStatusEmail } from '../email/email-bookings'
import { invalidateBookingsCache } from './cache'
import { dateKeyToOrdinal, toDailyWallClockMinutes, toManilaDateKey } from './date-time'
import type { UpdateBookingApprovalResult } from './types'

function getBookingHours(booking: {
    bookingType: string
    startDate: Date
    endDate: Date
    dailyTimeStart: Date | null
    dailyTimeEnd: Date | null
}): number {
    const diffHours = (booking.endDate.getTime() - booking.startDate.getTime()) / 3600000
    if (booking.bookingType !== 'DAILY' || !booking.dailyTimeStart || !booking.dailyTimeEnd) {
        return Math.max(0, diffHours)
    }

    const startOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.startDate))
    const endOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.endDate))
    const dayCount = Math.max(0, endOrdinal - startOrdinal + 1)
    const dailyMinutes = Math.max(0, toDailyWallClockMinutes(booking.dailyTimeEnd) - toDailyWallClockMinutes(booking.dailyTimeStart))

    if (!dayCount || !dailyMinutes) {
        return Math.max(0, diffHours)
    }

    return (dayCount * dailyMinutes) / 60
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

        const existingBooking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                deletedAt: null,
            },
            select: {
                id: true,
                companyId: true,
                approvalStatus: true,
                bookingType: true,
                startDate: true,
                endDate: true,
                dailyTimeStart: true,
                dailyTimeEnd: true,
                creditHoursUsed: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        allottedCreditHours: true,
                        usedCreditHours: true,
                        representative: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        })

        if (!existingBooking) {
            return { success: false, error: 'Booking not found.' }
        }

        const computedHours = getBookingHours(existingBooking)
        const oldHours = existingBooking.approvalStatus === 'APPROVED' ? existingBooking.creditHoursUsed : 0
        const newHours = approvalStatus === 'APPROVED' ? computedHours : 0
        const companyUsageDelta = newHours - oldHours

        const updatedBooking = await prisma.$transaction(async (tx) => {
            const booking = await tx.booking.update({
                where: {
                    id: bookingId,
                    deletedAt: null,
                },
                data: {
                    approvalStatus,
                    creditHoursUsed: newHours,
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

            if (existingBooking.companyId && existingBooking.company) {
                const nextUsedCreditHours = Math.max(0, existingBooking.company.usedCreditHours + companyUsageDelta)
                await tx.company.update({
                    where: { id: existingBooking.companyId },
                    data: { usedCreditHours: nextUsedCreditHours },
                })
            }

            return booking
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

        if (existingBooking.companyId) {
            await notifyRepresentativeIfCreditsLow(existingBooking.companyId)
        }

        await invalidateCompaniesStatsCache(existingBooking.companyId)
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
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { getBookingSlotsForDateRange } from './conflicts'
import { dateKeyToOrdinal, parseDateKey } from './date-time'
import type { GetRoomUnavailableSlotsInput, GetRoomUnavailableSlotsResult } from './types'

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

        const queryStart = new Date(`${startKey}T00:00:00+08:00`)
        const queryEnd = new Date(`${endKey}T23:59:59.999+08:00`)

        const overlappingBookings = await prisma.booking.findMany({
            where: {
                roomId,
                isActive: true,
                deletedAt: null,
                approvalStatus: { in: ['RESCHEDULED', 'CONFIRMED'] },
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
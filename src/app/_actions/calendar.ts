'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'

export type CalendarBooking = {
    id: string
    bookingReference: string
    startDate: string
    endDate: string
    roomName: string
    buildingName: string
    buildingId: string // Added to ensure unique identification
    approvalStatus: string
    submittedByName: string | null
    companyName: string | null
}

export type BuildingFilterOption = {
    id: string
    name: string
}

interface GetCalendarBookingsResult {
    success: boolean
    data?: CalendarBooking[]
    buildings?: BuildingFilterOption[] // New field for the filter dropdown
    error?: string
}

export async function getCalendarBookings(
    year: number,
    month: number,
    buildingId?: string // Optional filter to reduce data over-the-wire
): Promise<GetCalendarBookingsResult> {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

        // Run queries in parallel
        const [bookings, filterBuildings] = await Promise.all([
            // Query 1: Fetch Bookings
            prisma.booking.findMany({
                where: {
                    isActive: true,
                    deletedAt: null,
                    // If a buildingId is provided, filter at the DB level
                    ...(buildingId && buildingId !== 'all' ? { buildingId } : {}),
                    OR: [
                        { startDate: { gte: startOfMonth, lte: endOfMonth } },
                        { endDate: { gte: startOfMonth, lte: endOfMonth } },
                        {
                            AND: [
                                { startDate: { lte: startOfMonth } },
                                { endDate: { gte: endOfMonth } },
                            ],
                        },
                    ],
                },
                // OPTIMIZATION: Use 'select' to only pull necessary columns
                select: {
                    id: true,
                    bookingReference: true,
                    startDate: true,
                    endDate: true,
                    approvalStatus: true,
                    room: { select: { roomName: true } },
                    building: { select: { id: true, buildingName: true } },
                    submittedBy: { select: { name: true, companyName: true } },
                },
                orderBy: { startDate: 'asc' },
            }),

            // Query 2: Fetch only buildings that have active rooms/bookings for the filter dropdown
            // This is much faster than mapping 1000s of booking records in JS
            prisma.building.findMany({
                where: { deletedAt: null },
                select: { id: true, buildingName: true },
                orderBy: { buildingName: 'asc' }
            })
        ]);

        const formatted: CalendarBooking[] = bookings.map((booking) => ({
            id: booking.id,
            bookingReference: booking.bookingReference,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            roomName: booking.room.roomName,
            buildingName: booking.building.buildingName,
            buildingId: booking.building.id,
            approvalStatus: booking.approvalStatus,
            submittedByName: booking.submittedBy.name,
            companyName: booking.submittedBy.companyName,
        }))

        return { 
            success: true, 
            data: formatted, 
            buildings: filterBuildings.map(b => ({ id: b.id, name: b.buildingName })) 
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch calendar bookings.'
        console.error('Get calendar bookings error:', message)
        return { success: false, error: message }
    }
}
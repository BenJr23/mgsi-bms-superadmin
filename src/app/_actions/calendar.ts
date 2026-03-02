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
    month: number
): Promise<GetCalendarBookingsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

        const bookings = await prisma.booking.findMany({
            where: {
                isActive: true,
                deletedAt: null,
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
            include: {
                room: { select: { roomName: true } },
                building: { select: { id: true, buildingName: true } },
                submittedBy: { select: { name: true, companyName: true } },
            },
            orderBy: { startDate: 'asc' },
        })

        const formatted: CalendarBooking[] = bookings.map((booking) => ({
            id: booking.id,
            bookingReference: booking.bookingReference,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            roomName: booking.room.roomName,
            buildingName: booking.building.buildingName,
            buildingId: booking.building.id, // Map the ID
            approvalStatus: booking.approvalStatus,
            submittedByName: booking.submittedBy.name,
            companyName: booking.submittedBy.companyName,
        }))

        // --- Logic to extract unique buildings ---
        // We use a Map to ensure unique building IDs
        const buildingMap = new Map<string, string>();
        bookings.forEach(b => {
            buildingMap.set(b.building.id, b.building.buildingName);
        });

        const buildings: BuildingFilterOption[] = Array.from(buildingMap.entries()).map(
            ([id, name]) => ({ id, name })
        ).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        return { 
            success: true, 
            data: formatted, 
            buildings: buildings 
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch calendar bookings.'
        console.error('Get calendar bookings error:', message)
        return { success: false, error: message }
    }
}
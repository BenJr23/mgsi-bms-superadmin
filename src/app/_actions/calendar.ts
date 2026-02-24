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
	approvalStatus: string
	submittedByName: string | null
}

interface GetCalendarBookingsResult {
	success: boolean
	data?: CalendarBooking[]
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

		// Calculate month boundaries
		const startOfMonth = new Date(year, month, 1)
		const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

		const bookings = await prisma.booking.findMany({
			where: {
				isActive: true,
				deletedAt: null,
				OR: [
					{
						startDate: {
							gte: startOfMonth,
							lte: endOfMonth,
						},
					},
					{
						endDate: {
							gte: startOfMonth,
							lte: endOfMonth,
						},
					},
					{
						AND: [
							{ startDate: { lte: startOfMonth } },
							{ endDate: { gte: endOfMonth } },
						],
					},
				],
			},
			include: {
				room: {
					select: {
						roomName: true,
					},
				},
				building: {
					select: {
						buildingName: true,
					},
				},
				submittedBy: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				startDate: 'asc',
			},
		})

		const formatted: CalendarBooking[] = bookings.map((booking) => ({
			id: booking.id,
			bookingReference: booking.bookingReference,
			startDate: booking.startDate.toISOString(),
			endDate: booking.endDate.toISOString(),
			roomName: booking.room.roomName,
			buildingName: booking.building.buildingName,
			approvalStatus: booking.approvalStatus,
			submittedByName: booking.submittedBy.name,
		}))

		return { success: true, data: formatted }
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch calendar bookings.'
		console.error('Get calendar bookings error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

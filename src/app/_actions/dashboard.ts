'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'

export type DashboardStats = {
	pendingBookings: number
	activeBuildings: number
	totalRooms: number
	occupancyRate: number
}

export type RecentBooking = {
	id: string
	bookingReference: string
	submittedByName: string | null
	submittedByCompany: string | null
	roomName: string
	date: string
	approvalStatus: string
}

interface GetDashboardStatsResult {
	success: boolean
	data?: DashboardStats
	error?: string
}

interface GetRecentBookingsResult {
	success: boolean
	data?: RecentBooking[]
	error?: string
}

export async function getDashboardStats(): Promise<GetDashboardStatsResult> {
	try {
		const session = await getServerSession()

		if (!session?.user?.id) {
			return { success: false, error: 'Not authenticated.' }
		}

		// Get pending bookings count
		const pendingCount = await prisma.booking.count({
			where: {
				approvalStatus: 'PENDING',
				isActive: true,
				deletedAt: null,
			},
		})

		// Get active buildings count
		const buildingsCount = await prisma.building.count({
			where: {
				status: 'ACTIVE',
				deletedAt: null,
			},
		})

		// Get total rooms count from all buildings
		const roomsCount = await prisma.room.count({
			where: {
				deletedAt: null,
				building: {
					deletedAt: null,
				},
			},
		})

		const todayStart = new Date(2026, 2, 2, 9, 0, 0)
		const todayEnd = new Date(2026, 2, 2, 18, 0, 0)

		// Get all rooms with their bookings for today
		const roomsWithBookings = await prisma.room.findMany({
			where: {
				deletedAt: null,
				bookings: {
					some: {
						isActive: true,
						deletedAt: null,
						approvalStatus: 'APPROVED',
						// Booking overlaps with today's business hours
					},
				},
			},
			include: {
				bookings: {
					where: {
						isActive: true,
						deletedAt: null,
						approvalStatus: 'APPROVED',
					},
				},
			},
		})

		// Total rooms in active buildings for accurate occupancy rate
		const activeRoomsCount = await prisma.room.count({
			where: {
				deletedAt: null,
				building: {
					status: 'ACTIVE',
					deletedAt: null,
				},
			},
		})

		// Calculate total booked hours across all rooms
		let totalBookedHours = 0

		for (const room of roomsWithBookings) {
			const bookings = room.bookings

			if (bookings.length === 0) continue

			// Track occupied time slots (in minutes) to handle overlaps
			const occupiedSlots = new Set<number>()

			for (const booking of bookings) {
				// Adjust for timezone - subtract 8 hours since stored time is in PH time
				const phOffset = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
				const bookingStart = new Date(new Date(booking.dailyTimeStart!).getTime() - phOffset)
				const bookingEnd = new Date(new Date(booking.dailyTimeEnd!).getTime() - phOffset)

				// Clamp booking times to today's business hours
				const effectiveStart = bookingStart < todayStart ? todayStart : bookingStart
				const effectiveEnd = bookingEnd > todayEnd ? todayEnd : bookingEnd

				// Mark time slots as occupied (in 1-minute intervals for precision)
				const startMinute = Math.floor(effectiveStart.getTime() / (1000 * 60))
				const endMinute = Math.ceil(effectiveEnd.getTime() / (1000 * 60))
				const minutesDuration = endMinute - startMinute

				for (let minute = startMinute; minute < endMinute; minute++) {
					occupiedSlots.add(minute)
				}
			}

			// Calculate hours for this room (cap at 9 hours = 540 minutes)
			const roomBookedMinutes = Math.min(occupiedSlots.size, 540)
			totalBookedHours += roomBookedMinutes / 60
		}

		// Calculate occupancy rate
		const totalAvailableHours = activeRoomsCount * 9 // 9 hours per room per day
		const rawOccupancyRate = totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0
		const occupancyRate = parseFloat(rawOccupancyRate.toFixed(2))

		return {
			success: true,
			data: {
				pendingBookings: pendingCount,
				activeBuildings: buildingsCount,
				totalRooms: roomsCount,
				occupancyRate,
			},
		}
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch dashboard stats.'
		console.error('Get dashboard stats error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

export async function getRecentBookings(): Promise<GetRecentBookingsResult> {
	try {
		const session = await getServerSession()

		if (!session?.user?.id) {
			return { success: false, error: 'Not authenticated.' }
		}

		const bookings = await prisma.booking.findMany({
			where: {
				isActive: true,
				deletedAt: null,
			},
			include: {
				submittedBy: {
					select: {
						name: true,
						companyName: true,
					},
				},
				room: {
					select: {
						roomName: true,
					},
				},
			},
			orderBy: {
				submittedAt: 'desc',
			},
			take: 5,
		})

		const formatted: RecentBooking[] = bookings.map((booking: any) => ({
			id: booking.id,
			bookingReference: booking.bookingReference,
			submittedByName: booking.submittedBy.name,
			submittedByCompany: booking.submittedBy.companyName,
			roomName: booking.room.roomName,
			date: booking.startDate.toISOString(),
			approvalStatus: booking.approvalStatus,
		}))

		return { success: true, data: formatted }
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch recent bookings.'
		console.error('Get recent bookings error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

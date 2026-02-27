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

export type BuildingOccupancy = {
	id: string
	buildingName: string
	totalRooms: number
	occupancyRate: number
	bookedHours: number
	availableHours: number
}

export type RoomOccupancy = {
	id: string
	roomName: string
	buildingName: string
	occupancyRate: number
	bookedHours: number
	availableHours: number
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

interface GetBuildingOccupancyResult {
	success: boolean
	data?: BuildingOccupancy[]
	error?: string
}

interface GetRoomOccupancyResult {
	success: boolean
	data?: RoomOccupancy[]
	error?: string
}

/**
 * Helper function to calculate booked hours for a room on a given date
 * Handles overlapping bookings and clamps to 9am-6pm window
 */
function calculateRoomBookedHours(
	bookings: Array<{ startDate: Date; endDate: Date }>,
	todayStart: Date,
	todayEnd: Date
): number {
	if (bookings.length === 0) return 0

	const clampedIntervals: Array<{ start: number; end: number }> = []

	for (const booking of bookings) {
		const bookingStart = new Date(booking.startDate)
		const bookingEnd = new Date(booking.endDate)

		// Clamp booking times to today's business hours
		const effectiveStart = bookingStart < todayStart ? todayStart : bookingStart
		const effectiveEnd = bookingEnd > todayEnd ? todayEnd : bookingEnd

		// Skip if booking doesn't overlap with business hours
		if (effectiveStart >= effectiveEnd) continue

		clampedIntervals.push({
			start: effectiveStart.getTime(),
			end: effectiveEnd.getTime(),
		})
	}

	if (clampedIntervals.length === 0) return 0

	clampedIntervals.sort((a, b) => a.start - b.start)
	const mergedIntervals: Array<{ start: number; end: number }> = []

	for (const interval of clampedIntervals) {
		const lastInterval = mergedIntervals[mergedIntervals.length - 1]

		if (!lastInterval || interval.start >= lastInterval.end) {
			mergedIntervals.push({ ...interval })
			continue
		}

		lastInterval.end = Math.max(lastInterval.end, interval.end)
	}

	let totalBookedMs = 0
	for (const interval of mergedIntervals) {
		totalBookedMs += interval.end - interval.start
	}

	// Cap booked hours at 9 hours maximum per room/day
	const maxBookedMs = 9 * 60 * 60 * 1000
	return Math.min(totalBookedMs, maxBookedMs) / (60 * 60 * 1000)
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

		// Calculate occupancy rate for today only (09:00-18:00) across all active buildings
		const now = new Date()
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)
		const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0)

		// Get all active buildings with their rooms and bookings
		const activeBuildings = await prisma.building.findMany({
			where: {
				status: 'ACTIVE',
				deletedAt: null,
			},
			include: {
				rooms: {
					where: {
						deletedAt: null,
					},
					include: {
						bookings: {
							where: {
								isActive: true,
								deletedAt: null,
								approvalStatus: 'APPROVED',
								startDate: { lt: todayEnd },
								endDate: { gt: todayStart },
							},
							select: {
								startDate: true,
								endDate: true,
							},
						},
					},
				},
			},
		})

		// Calculate total booked hours and available hours across all active buildings
		let totalBookedHours = 0
		let totalActiveRooms = 0

		for (const building of activeBuildings) {
			for (const room of building.rooms) {
				totalActiveRooms++
				const bookedHours = calculateRoomBookedHours(room.bookings, todayStart, todayEnd)
				totalBookedHours += bookedHours
			}
		}

		// Calculate overall occupancy rate
		const totalAvailableHours = totalActiveRooms * 9
		const occupancyRate =
			totalAvailableHours > 0
				? parseFloat(((totalBookedHours / totalAvailableHours) * 100).toFixed(2))
				: 0

		console.log('=== Occupancy Rate Calculation (Active Buildings Only) ===')
		console.log('Total Rooms (All):', roomsCount)
		console.log('Active Buildings:', buildingsCount)
		console.log('Active Rooms:', totalActiveRooms)
		console.log('Total Booked Hours:', totalBookedHours.toFixed(2))
		console.log('Total Available Hours:', totalAvailableHours)
		console.log('Occupancy Rate:', occupancyRate + '%')
		console.log('=============================================================')

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

/**
 * Get occupancy rates for all buildings for today (9am-6pm)
 */
export async function getBuildingOccupancyRates(): Promise<GetBuildingOccupancyResult> {
	try {
		const session = await getServerSession()

		if (!session?.user?.id) {
			return { success: false, error: 'Not authenticated.' }
		}

		// Define today's business hours (9am-6pm)
		const now = new Date()
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)
		const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0)

		// Get all active buildings with their rooms and bookings for today
		const buildings = await prisma.building.findMany({
			where: {
				deletedAt: null,
			},
			include: {
				rooms: {
					where: {
						deletedAt: null,
					},
					include: {
						bookings: {
							where: {
								isActive: true,
								deletedAt: null,
								approvalStatus: 'APPROVED',
								// Booking overlaps with today's business hours
								startDate: { lt: todayEnd },
								endDate: { gt: todayStart },
							},
							select: {
								startDate: true,
								endDate: true,
							},
						},
					},
				},
			},
		})

		const buildingOccupancy: BuildingOccupancy[] = buildings.map((building) => {
			const totalRooms = building.rooms.length
			const availableHours = totalRooms * 9 // 9 hours per room

			// Calculate total booked hours across all rooms in this building
			let totalBookedHours = 0
			for (const room of building.rooms) {
				const bookedHours = calculateRoomBookedHours(room.bookings, todayStart, todayEnd)
				totalBookedHours += bookedHours
			}

			// Calculate occupancy rate
			const occupancyRate =
				availableHours > 0
					? parseFloat(((totalBookedHours / availableHours) * 100).toFixed(2))
					: 0

			return {
				id: building.id,
				buildingName: building.buildingName,
				totalRooms,
				occupancyRate,
				bookedHours: parseFloat(totalBookedHours.toFixed(2)),
				availableHours,
			}
		})

		return { success: true, data: buildingOccupancy }
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'Failed to fetch building occupancy rates.'
		console.error('Get building occupancy error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

/**
 * Get occupancy rates for all rooms for today (9am-6pm)
 */
export async function getRoomOccupancyRates(): Promise<GetRoomOccupancyResult> {
	try {
		const session = await getServerSession()

		if (!session?.user?.id) {
			return { success: false, error: 'Not authenticated.' }
		}

		// Define today's business hours (9am-6pm)
		const now = new Date()
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)
		const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0)

		// Get all rooms with their bookings for today
		const rooms = await prisma.room.findMany({
			where: {
				deletedAt: null,
			},
			include: {
				building: {
					select: {
						buildingName: true,
					},
				},
				bookings: {
					where: {
						isActive: true,
						deletedAt: null,
						approvalStatus: 'APPROVED',
						// Booking overlaps with today's business hours
						startDate: { lt: todayEnd },
						endDate: { gt: todayStart },
					},
					select: {
						startDate: true,
						endDate: true,
					},
				},
			},
		})

		const roomOccupancy: RoomOccupancy[] = rooms.map((room) => {
			const availableHours = 9 // 9 hours per day (9am-6pm)

			// Calculate booked hours for this room
			const bookedHours = calculateRoomBookedHours(room.bookings, todayStart, todayEnd)

			// Calculate occupancy rate
			const occupancyRate = parseFloat(((bookedHours / availableHours) * 100).toFixed(2))

			return {
				id: room.id,
				roomName: room.roomName,
				buildingName: room.building.buildingName,
				occupancyRate,
				bookedHours: parseFloat(bookedHours.toFixed(2)),
				availableHours,
			}
		})

		return { success: true, data: roomOccupancy }
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch room occupancy rates.'
		console.error('Get room occupancy error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

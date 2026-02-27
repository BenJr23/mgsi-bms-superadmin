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

		// Calculate occupancy rate (only count rooms from active buildings)
		const now = new Date()
		const roomsWithActiveBookings = await prisma.room.count({
			where: {
				deletedAt: null,
				building: {
					status: 'ACTIVE',
					deletedAt: null,
				},
				bookings: {
					some: {
						isActive: true,
						deletedAt: null,
						approvalStatus: 'APPROVED',
						startDate: { lte: now },
						endDate: { gte: now },
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

		const occupancyRate =
			activeRoomsCount > 0 ? Math.round((roomsWithActiveBookings / activeRoomsCount) * 100) : 0

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

		const formatted: RecentBooking[] = bookings.map((booking) => ({
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

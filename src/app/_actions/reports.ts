'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'

export type ReportSummary = {
	totalBookings: number
	totalBookingsChange: number
	averageDurationHours: number
	averageDurationChange: number
}

export type MonthlyBookingVolume = {
	monthLabel: string
	count: number
}

export type RoomUsageItem = {
	roomId: string
	roomName: string
	usagePercent: number
	bookingCount: number
}

export type ReportsData = {
	summary: ReportSummary
	monthlyBookingVolume: MonthlyBookingVolume[]
	roomUsageDistribution: RoomUsageItem[]
}

interface GetReportsDataResult {
	success: boolean
	data?: ReportsData
	error?: string
}

function getMonthRange(baseDate: Date) {
	const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
	const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1)
	return { start, end }
}

function getPercentChange(current: number, previous: number): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0
	}

	return Math.round(((current - previous) / previous) * 100)
}

function calculateAverageDurationHours(
	bookings: Array<{ startDate: Date; endDate: Date }>
): number {
	if (bookings.length === 0) {
		return 0
	}

	const totalHours = bookings.reduce((sum, booking) => {
		const durationInHours =
			(booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60)
		return sum + Math.max(durationInHours, 0)
	}, 0)

	return Number((totalHours / bookings.length).toFixed(1))
}

export async function getReportsData(): Promise<GetReportsDataResult> {
	try {
		const session = await getServerSession()

		if (!session?.user?.id) {
			return { success: false, error: 'Not authenticated.' }
		}

		const now = new Date()
		const currentMonthRange = getMonthRange(now)
		const previousMonthRange = getMonthRange(
			new Date(now.getFullYear(), now.getMonth() - 1, 1)
		)

		const [
			totalBookings,
			currentMonthBookings,
			previousMonthBookings,
			currentMonthDurationBookings,
			previousMonthDurationBookings,
			bookingsThisYear,
			approvedBookings,
		] = await Promise.all([
			prisma.booking.count({
				where: {
					deletedAt: null,
				},
			}),
			prisma.booking.count({
				where: {
					deletedAt: null,
					startDate: {
						gte: currentMonthRange.start,
						lt: currentMonthRange.end,
					},
				},
			}),
			prisma.booking.count({
				where: {
					deletedAt: null,
					startDate: {
						gte: previousMonthRange.start,
						lt: previousMonthRange.end,
					},
				},
			}),
			prisma.booking.findMany({
				where: {
					deletedAt: null,
					startDate: {
						gte: currentMonthRange.start,
						lt: currentMonthRange.end,
					},
				},
				select: {
					startDate: true,
					endDate: true,
				},
			}),
			prisma.booking.findMany({
				where: {
					deletedAt: null,
					startDate: {
						gte: previousMonthRange.start,
						lt: previousMonthRange.end,
					},
				},
				select: {
					startDate: true,
					endDate: true,
				},
			}),
			prisma.booking.findMany({
				where: {
					deletedAt: null,
					startDate: {
						gte: new Date(now.getFullYear(), 0, 1),
						lt: new Date(now.getFullYear() + 1, 0, 1),
					},
				},
				select: {
					startDate: true,
				},
			}),
			prisma.booking.findMany({
				where: {
					deletedAt: null,
					approvalStatus: 'APPROVED',
					room: {
						deletedAt: null,
					},
				},
				select: {
					roomId: true,
					room: {
						select: {
							id: true,
							roomName: true,
						},
					},
				},
			}),
		])

		const monthlyCounts = new Array<number>(12).fill(0)
		for (const booking of bookingsThisYear) {
			const month = booking.startDate.getMonth()
			monthlyCounts[month] += 1
		}

		const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
		const monthlyBookingVolume: MonthlyBookingVolume[] = monthLabels.map((monthLabel, index) => ({
			monthLabel,
			count: monthlyCounts[index],
		}))

		const roomUsageMap = new Map<string, { roomName: string; bookingCount: number }>()
		for (const booking of approvedBookings) {
			const existing = roomUsageMap.get(booking.roomId)
			if (existing) {
				existing.bookingCount += 1
			} else {
				roomUsageMap.set(booking.roomId, {
					roomName: booking.room.roomName,
					bookingCount: 1,
				})
			}
		}

		const totalApproved = approvedBookings.length
		const roomUsageDistribution: RoomUsageItem[] = Array.from(roomUsageMap.entries())
			.map(([roomId, value]) => ({
				roomId,
				roomName: value.roomName,
				bookingCount: value.bookingCount,
				usagePercent:
					totalApproved > 0 ? Math.round((value.bookingCount / totalApproved) * 100) : 0,
			}))
			.sort((a, b) => b.bookingCount - a.bookingCount)
			.slice(0, 5)

		const averageDurationHoursCurrent = calculateAverageDurationHours(currentMonthDurationBookings)
		const averageDurationHoursPrevious = calculateAverageDurationHours(previousMonthDurationBookings)

		const summary: ReportSummary = {
			totalBookings,
			totalBookingsChange: getPercentChange(currentMonthBookings, previousMonthBookings),
			averageDurationHours: averageDurationHoursCurrent,
			averageDurationChange: getPercentChange(
				averageDurationHoursCurrent,
				averageDurationHoursPrevious
			),
		}

		return {
			success: true,
			data: {
				summary,
				monthlyBookingVolume,
				roomUsageDistribution,
			},
		}
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch reports data.'
		console.error('Get reports data error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

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
	buildingName: string
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

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Asia/Manila',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
	return parts.find((part) => part.type === type)?.value ?? ''
}

function toManilaDateParts(date: Date): { year: number; month: number; day: number } {
	const parts = MANILA_DATE_FORMATTER.formatToParts(date)
	return {
		year: Number(getPartValue(parts, 'year')),
		month: Number(getPartValue(parts, 'month')),
		day: Number(getPartValue(parts, 'day')),
	}
}

function toManilaMonthRange(year: number, month: number) {
	const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`)

	const nextMonth = month === 12 ? 1 : month + 1
	const nextMonthYear = month === 12 ? year + 1 : year
	const end = new Date(`${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+08:00`)

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
		const { year: currentYear, month: currentMonth } = toManilaDateParts(now)
		const currentMonthRange = toManilaMonthRange(currentYear, currentMonth)
		const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
		const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
		const previousMonthRange = toManilaMonthRange(previousMonthYear, previousMonth)
		const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
		const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear
		const nextMonthRange = toManilaMonthRange(nextMonthYear, nextMonth)
		const yearRangeStart = new Date(`${currentYear}-01-01T00:00:00+08:00`)
		const yearRangeEnd = new Date(`${currentYear + 1}-01-01T00:00:00+08:00`)

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
						gte: yearRangeStart,
						lt: yearRangeEnd,
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
					building: {
						select: {
							buildingName: true,
						},
					},
				},
			}),
		])

		const monthlyCounts = new Array<number>(12).fill(0)
		for (const booking of bookingsThisYear) {
			const { month } = toManilaDateParts(booking.startDate)
			monthlyCounts[month - 1] += 1
		}

		const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
		const monthlyBookingVolume: MonthlyBookingVolume[] = monthLabels.map((monthLabel, index) => ({
			monthLabel,
			count: monthlyCounts[index],
		}))

		const roomUsageMap = new Map<string, { roomName: string; buildingName: string; bookingCount: number }>()
		for (const booking of approvedBookings) {
			const existing = roomUsageMap.get(booking.roomId)
			if (existing) {
				existing.bookingCount += 1
			} else {
				roomUsageMap.set(booking.roomId, {
					roomName: booking.room.roomName,
					buildingName: booking.building.buildingName,
					bookingCount: 1,
				})
			}
		}

		const totalApproved = approvedBookings.length
		const roomUsageDistribution: RoomUsageItem[] = Array.from(roomUsageMap.entries())
			.map(([roomId, value]) => ({
				roomId,
				roomName: value.roomName,
				buildingName: value.buildingName,
				bookingCount: value.bookingCount,
				usagePercent:
					totalApproved > 0 ? Math.round((value.bookingCount / totalApproved) * 100) : 0,
			}))
			.sort((a, b) => b.bookingCount - a.bookingCount)
			.slice(0, 5)

		let durationBookingsForCurrentAverage = currentMonthDurationBookings
		let durationBookingsForPreviousAverage = previousMonthDurationBookings

		if (currentMonthDurationBookings.length === 0) {
			const nextMonthDurationBookings = await prisma.booking.findMany({
				where: {
					deletedAt: null,
					startDate: {
						gte: nextMonthRange.start,
						lt: nextMonthRange.end,
					},
				},
				select: {
					startDate: true,
					endDate: true,
				},
			})

			durationBookingsForCurrentAverage = nextMonthDurationBookings
			durationBookingsForPreviousAverage = currentMonthDurationBookings
		}

		const averageDurationHoursCurrent = calculateAverageDurationHours(durationBookingsForCurrentAverage)
		const averageDurationHoursPrevious = calculateAverageDurationHours(durationBookingsForPreviousAverage)

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

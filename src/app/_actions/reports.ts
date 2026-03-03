'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'

export type ReportSummary = {
	totalBookings: number
	approvedBookings: number
	rejectedBookings: number
	pendingBookings: number
	cancelledBookings: number
	walkInBookings: number
	approvalRate: number
}

export type StatusDistributionItem = {
	status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'CANCELLED'
	count: number
}

export type BookingSourceDistributionItem = {
	source: 'WALK_IN' | 'ONLINE'
	count: number
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
	statusDistribution: StatusDistributionItem[]
	bookingSourceDistribution: BookingSourceDistributionItem[]
	bookingTrend: MonthlyBookingVolume[]
	topRooms: Array<{ roomId: string; roomName: string; buildingName: string; bookingCount: number }>
	topBuildings: Array<{ buildingId: string; buildingName: string; bookingCount: number }>
}

export type ReportsDatePreset = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'

export type GetReportsDataInput = {
	preset?: ReportsDatePreset
	startDate?: string | null
	endDate?: string | null
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

function toManilaDayRange(year: number, month: number, day: number) {
	const start = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+08:00`)
	const end = new Date(start)
	end.setDate(end.getDate() + 1)
	return { start, end }
}

function toManilaWeekRange(date: Date) {
	const { year, month, day } = toManilaDateParts(date)
	const start = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+08:00`)
	const jsDay = start.getDay() // 0=Sun
	const diffToMonday = (jsDay + 6) % 7
	start.setDate(start.getDate() - diffToMonday)
	const end = new Date(start)
	end.setDate(end.getDate() + 7)
	return { start, end }
}

function getSelectedRange(now: Date, input?: GetReportsDataInput) {
	const preset = input?.preset ?? 'THIS_MONTH'
	const { year, month, day } = toManilaDateParts(now)

	if (preset === 'TODAY') {
		return { preset, ...toManilaDayRange(year, month, day) }
	}

	if (preset === 'THIS_WEEK') {
		return { preset, ...toManilaWeekRange(now) }
	}

	if (preset === 'THIS_YEAR') {
		return {
			preset,
			start: new Date(`${year}-01-01T00:00:00+08:00`),
			end: new Date(`${year + 1}-01-01T00:00:00+08:00`),
		}
	}

	if (preset === 'CUSTOM') {
		const start = input?.startDate ? new Date(`${input.startDate}T00:00:00+08:00`) : null
		const end = input?.endDate ? new Date(`${input.endDate}T00:00:00+08:00`) : null
		if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
			return { preset: 'THIS_MONTH' as const, ...toManilaMonthRange(year, month) }
		}
		const endExclusive = new Date(end)
		endExclusive.setDate(endExclusive.getDate() + 1)
		return { preset, start, end: endExclusive }
	}

	// THIS_MONTH (default)
	return { preset, ...toManilaMonthRange(year, month) }
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

export async function getReportsData(input?: GetReportsDataInput): Promise<GetReportsDataResult> {
	try {
		const session = await getServerSession()

		if (!session?.user?.id) {
			return { success: false, error: 'Not authenticated.' }
		}

		const now = new Date()
		const selectedRange = getSelectedRange(now, input)
		const bookingWhereBase = {
			deletedAt: null,
			startDate: {
				gte: selectedRange.start,
				lt: selectedRange.end,
			},
		} as const

		const [
			totalBookings,
			approvedBookings,
			rejectedBookings,
			pendingBookings,
			cancelledBookings,
			walkInBookings,
			trendBookings,
			topRoomsRaw,
			topBuildingsRaw,
		] = await Promise.all([
			prisma.booking.count({ where: bookingWhereBase }),
			prisma.booking.count({ where: { ...bookingWhereBase, approvalStatus: 'APPROVED' } }),
			prisma.booking.count({ where: { ...bookingWhereBase, approvalStatus: 'REJECTED' } }),
			prisma.booking.count({ where: { ...bookingWhereBase, approvalStatus: 'PENDING' } }),
			prisma.booking.count({ where: { ...bookingWhereBase, clientStatus: 'CANCELLED' } }),
			prisma.booking.count({ where: { ...bookingWhereBase, submittedBy: { emailVerified: true } } }),
			prisma.booking.findMany({
				where: bookingWhereBase,
				select: { startDate: true },
			}),
			prisma.booking.groupBy({
				by: ['roomId', 'buildingId'],
				where: bookingWhereBase,
				_count: { roomId: true },
				orderBy: { _count: { roomId: 'desc' } },
				take: 10,
			}),
			prisma.booking.groupBy({
				by: ['buildingId'],
				where: bookingWhereBase,
				_count: { buildingId: true },
				orderBy: { _count: { buildingId: 'desc' } },
				take: 10,
			}),
		])

		const approvalRate = totalBookings > 0 ? Math.round((approvedBookings / totalBookings) * 100) : 0

		const summary: ReportSummary = {
			totalBookings,
			approvedBookings,
			rejectedBookings,
			pendingBookings,
			cancelledBookings,
			walkInBookings,
			approvalRate,
		}

		const statusDistribution: StatusDistributionItem[] = [
			{ status: 'APPROVED', count: approvedBookings },
			{ status: 'REJECTED', count: rejectedBookings },
			{ status: 'PENDING', count: pendingBookings },
			{ status: 'CANCELLED', count: cancelledBookings },
		]

		const bookingSourceDistribution: BookingSourceDistributionItem[] = [
			{ source: 'WALK_IN', count: walkInBookings },
			{ source: 'ONLINE', count: Math.max(totalBookings - walkInBookings, 0) },
		]

		// Build trend series based on selected range
		const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
		const isSingleYearPreset = selectedRange.preset === 'THIS_YEAR'
		const bookingTrend: MonthlyBookingVolume[] = isSingleYearPreset
			? (() => {
				const { year } = toManilaDateParts(now)
				const monthlyCounts = new Array<number>(12).fill(0)
				for (const booking of trendBookings) {
					const parts = toManilaDateParts(booking.startDate)
					if (parts.year !== year) continue
					monthlyCounts[parts.month - 1] += 1
				}
				return monthLabels.map((monthLabel, index) => ({ monthLabel, count: monthlyCounts[index] }))
			})()
			: (() => {
				// For non-year presets, show counts grouped by day (7-31 points) but reuse MonthlyBookingVolume type
				const dayMap = new Map<string, number>()
				for (const booking of trendBookings) {
					const parts = toManilaDateParts(booking.startDate)
					const key = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
					dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
				}
				return Array.from(dayMap.entries())
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([monthLabel, count]) => ({ monthLabel, count }))
			})()

		const roomIds = topRoomsRaw.map((row) => row.roomId)
		const buildingIds = topBuildingsRaw.map((row) => row.buildingId)

		const [rooms, buildings] = await Promise.all([
			prisma.room.findMany({
				where: { id: { in: roomIds }, deletedAt: null },
				select: { id: true, roomName: true, building: { select: { buildingName: true } } },
			}),
			prisma.building.findMany({
				where: { id: { in: buildingIds }, deletedAt: null },
				select: { id: true, buildingName: true },
			}),
		])

		const roomMap = new Map(rooms.map((r) => [r.id, r]))
		const buildingMap = new Map(buildings.map((b) => [b.id, b]))

		const topRooms = topRoomsRaw
			.map((row) => {
				const room = row.roomId ? roomMap.get(row.roomId) : null
				if (!room) return null
				const count = row._count.roomId
				return {
					roomId: room.id,
					roomName: room.roomName,
					buildingName: room.building.buildingName,
					bookingCount: count,
				}
			})
			.filter(Boolean)
			.slice(0, 5) as Array<{ roomId: string; roomName: string; buildingName: string; bookingCount: number }>

		const topBuildings = topBuildingsRaw
			.map((row) => {
				const building = buildingMap.get(row.buildingId)
				if (!building) return null
				const count = row._count.buildingId
				return {
					buildingId: building.id,
					buildingName: building.buildingName,
					bookingCount: count,
				}
			})
			.filter(Boolean)
			.slice(0, 5) as Array<{ buildingId: string; buildingName: string; bookingCount: number }>

		return {
			success: true,
			data: {
				summary,
				statusDistribution,
				bookingSourceDistribution,
				bookingTrend,
				topRooms,
				topBuildings,
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

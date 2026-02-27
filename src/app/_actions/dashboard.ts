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

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Asia/Manila',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})

const MANILA_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Asia/Manila',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
})

const BUSINESS_START_MINUTE = 9 * 60
const BUSINESS_END_MINUTE = 18 * 60
const BUSINESS_MINUTES_PER_DAY = BUSINESS_END_MINUTE - BUSINESS_START_MINUTE
const WEEKDAY_COUNT = 5

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
	return parts.find((part) => part.type === type)?.value ?? ''
}

function toManilaDateKey(date: Date): string {
	const parts = MANILA_DATE_FORMATTER.formatToParts(date)
	const year = getPartValue(parts, 'year')
	const month = getPartValue(parts, 'month')
	const day = getPartValue(parts, 'day')
	return `${year}-${month}-${day}`
}

function toManilaMinutes(date: Date): number {
	const parts = MANILA_TIME_FORMATTER.formatToParts(date)
	const hour = Number(getPartValue(parts, 'hour'))
	const minute = Number(getPartValue(parts, 'minute'))
	return (hour * 60) + minute
}

function toDailyWallClockMinutes(date: Date): number {
	return (date.getUTCHours() * 60) + date.getUTCMinutes()
}

function dateKeyToOrdinal(dateKey: string): number {
	const [year, month, day] = dateKey.split('-').map(Number)
	return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function ordinalToWeekday(ordinal: number): number {
	return new Date(ordinal * 86400000).getUTCDay()
}

function clampRange(start: number, end: number, clampStart: number, clampEnd: number): [number, number] | null {
	const effectiveStart = Math.max(start, clampStart)
	const effectiveEnd = Math.min(end, clampEnd)
	return effectiveStart < effectiveEnd ? [effectiveStart, effectiveEnd] : null
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

		// Total rooms in active buildings for accurate occupancy rate denominator
		const activeRoomsCount = await prisma.room.count({
			where: {
				deletedAt: null,
				building: {
					status: 'ACTIVE',
					deletedAt: null,
				},
			},
		})

		const todayManilaOrdinal = dateKeyToOrdinal(toManilaDateKey(new Date()))
		const todayWeekday = ordinalToWeekday(todayManilaOrdinal)
		const mondayOffset = todayWeekday === 0 ? 6 : todayWeekday - 1
		const weekStartOrdinal = todayManilaOrdinal - mondayOffset
		const weekEndOrdinal = weekStartOrdinal + (WEEKDAY_COUNT - 1)

		const weekStartDate = new Date(weekStartOrdinal * 86400000)
		const weekEndDate = new Date((weekEndOrdinal + 1) * 86400000 - 1)

		const fetchWeekBookings = async (startOrdinal: number, endOrdinal: number) => {
			const startDate = new Date(startOrdinal * 86400000)
			const endDate = new Date((endOrdinal + 1) * 86400000 - 1)

			const bookings = await prisma.booking.findMany({
				where: {
					isActive: true,
					deletedAt: null,
					approvalStatus: 'APPROVED',
					startDate: {
						lte: endDate,
					},
					endDate: {
						gte: startDate,
					},
					room: {
						deletedAt: null,
						building: {
							status: 'ACTIVE',
							deletedAt: null,
						},
					},
				},
				select: {
					bookingReference: true,
					roomId: true,
					startDate: true,
					endDate: true,
					dailyTimeStart: true,
					dailyTimeEnd: true,
					bookingType: true,
					room: {
						select: {
							roomName: true,
							building: {
								select: {
									buildingName: true,
								},
							},
						},
					},
				},
			})

			return { bookings, startOrdinal, endOrdinal }
		}

		let occupancyWindow = await fetchWeekBookings(weekStartOrdinal, weekEndOrdinal)

		if (occupancyWindow.bookings.length === 0) {
			const nextWeekStartOrdinal = weekStartOrdinal + 7
			const nextWeekEndOrdinal = weekEndOrdinal + 7
			occupancyWindow = await fetchWeekBookings(nextWeekStartOrdinal, nextWeekEndOrdinal)
		}

		const weekBookings = occupancyWindow.bookings
		const occupancyWeekStartOrdinal = occupancyWindow.startOrdinal
		const occupancyWeekEndOrdinal = occupancyWindow.endOrdinal

		console.log('[dashboard] occupancyWindow:', {
			weekStartOrdinal: occupancyWeekStartOrdinal,
			weekEndOrdinal: occupancyWeekEndOrdinal,
			bookingsCount: weekBookings.length,
		})

		for (const booking of weekBookings) {
			console.log('[dashboard] bookingUsed:', {
				bookingReference: booking.bookingReference,
				bookingType: booking.bookingType,
				buildingName: booking.room.building.buildingName,
				roomName: booking.room.roomName,
				startDate: booking.startDate.toISOString(),
				endDate: booking.endDate.toISOString(),
				dailyTimeStart: booking.dailyTimeStart ? booking.dailyTimeStart.toISOString() : null,
				dailyTimeEnd: booking.dailyTimeEnd ? booking.dailyTimeEnd.toISOString() : null,
			})
		}

		const occupiedMinutesByRoomDay = new Map<string, Set<number>>()

		for (const booking of weekBookings) {
			const bookingStartOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.startDate))
			const bookingEndOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.endDate))

			const fromOrdinal = Math.max(bookingStartOrdinal, occupancyWeekStartOrdinal)
			const toOrdinal = Math.min(bookingEndOrdinal, occupancyWeekEndOrdinal)

			if (fromOrdinal > toOrdinal) continue

			for (let dayOrdinal = fromOrdinal; dayOrdinal <= toOrdinal; dayOrdinal++) {
				let dayStartMinute = 0
				let dayEndMinute = 24 * 60

				if (booking.dailyTimeStart && booking.dailyTimeEnd) {
					dayStartMinute = toDailyWallClockMinutes(booking.dailyTimeStart)
					dayEndMinute = toDailyWallClockMinutes(booking.dailyTimeEnd)
				} else {
					if (dayOrdinal === bookingStartOrdinal) {
						dayStartMinute = toManilaMinutes(booking.startDate)
					}
					if (dayOrdinal === bookingEndOrdinal) {
						dayEndMinute = toManilaMinutes(booking.endDate)
					}
				}

				const clamped = clampRange(dayStartMinute, dayEndMinute, BUSINESS_START_MINUTE, BUSINESS_END_MINUTE)
				if (!clamped) continue

				const [effectiveStart, effectiveEnd] = clamped
				const roomDayKey = `${booking.roomId}:${dayOrdinal}`
				const occupiedMinutes = occupiedMinutesByRoomDay.get(roomDayKey) ?? new Set<number>()

				for (let minute = effectiveStart; minute < effectiveEnd; minute++) {
					occupiedMinutes.add(minute)
				}

				occupiedMinutesByRoomDay.set(roomDayKey, occupiedMinutes)
			}
		}

		const totalBookedMinutes = Array.from(occupiedMinutesByRoomDay.values()).reduce(
			(total, occupiedMinutes) => total + Math.min(occupiedMinutes.size, BUSINESS_MINUTES_PER_DAY),
			0,
		)
		const totalBookedHours = totalBookedMinutes / 60

		// Calculate weekly weekday occupancy rate: 5 days × rooms × 9 business hours
		const totalAvailableHours = activeRoomsCount * WEEKDAY_COUNT * (BUSINESS_MINUTES_PER_DAY / 60)
		const rawOccupancyRate = totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0
		const occupancyRate = parseFloat(rawOccupancyRate.toFixed(2))

		console.log('[dashboard] totalAvailableHours:', totalAvailableHours)
		console.log('[dashboard] totalBookedHours:', totalBookedHours)
		console.log('[dashboard] occupancyRate:', occupancyRate)

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
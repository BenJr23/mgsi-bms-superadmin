'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'

export type DashboardStats = {
  pendingBookings: number
  activeBuildings: number
  totalRooms: number
  occupancyRate: number
  occupancyWindowLabel: 'THIS_WEEK' | 'NEXT_WEEK'
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

export type TodayLocationCount = {
  location: 'GW1' | 'GW2' | 'GW3' | 'GW4'
  total: number
}

export type DashboardPeriod = 'weekly' | 'monthly'

export type DashboardAnalyticsPoint = {
  name: string
  bookings: number
  occupancy: number
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

interface GetTodayBookingsPerLocationResult {
  success: boolean
  data?: TodayLocationCount[]
  error?: string
}

interface GetBookingAnalyticsResult {
  success: boolean
  data?: DashboardAnalyticsPoint[]
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
  return hour * 60 + minute
}

function toDailyWallClockMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes()
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

function toOrdinalDateBounds(startOrdinal: number, endOrdinal: number): { startDate: Date; endDate: Date } {
  return {
    startDate: new Date(startOrdinal * 86400000),
    endDate: new Date((endOrdinal + 1) * 86400000 - 1),
  }
}

function getDayNameFromOrdinal(ordinal: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(new Date(ordinal * 86400000))
}

const DASHBOARD_CACHE_VERSION = 3
const DASHBOARD_CACHE_VERSION_KEY = 'dashboard:cache:version'

async function getDashboardCacheVersion(): Promise<number> {
  if (!redis) return 0
  try {
    const version = await redis.get<number>(DASHBOARD_CACHE_VERSION_KEY)
    return typeof version === 'number' && Number.isFinite(version) ? version : 0
  } catch (error) {
    console.error('Get dashboard cache version error:', error)
    return 0
  }
}

export async function invalidateDashboardCache(): Promise<void> {
  if (!redis) return
  try {
    await redis.incr(DASHBOARD_CACHE_VERSION_KEY)
  } catch (error) {
    console.error('Invalidate dashboard cache error:', error)
  }
}

function getCacheContextKey(dateKey: string, runtimeVersion: number): string {
  return `v${DASHBOARD_CACHE_VERSION}.${runtimeVersion}:${dateKey}`
}

// ---------------------- GET DASHBOARD STATS ----------------------
export async function getDashboardStats(): Promise<GetDashboardStatsResult> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

    const todayKey = toManilaDateKey(new Date())
    const runtimeVersion = await getDashboardCacheVersion()
    const cacheKey = `dashboard:stats:${getCacheContextKey(todayKey, runtimeVersion)}`
    if (redis) {
      try {
        const cached = await redis.get<GetDashboardStatsResult>(cacheKey)
        if (cached) return cached
      } catch (error) {
        console.error('Get dashboard stats cache read error:', error)
      }
    }

    const pendingCount = await prisma.booking.count({
      where: { approvalStatus: 'RESCHEDULED', isActive: true, deletedAt: null },
    })

    const buildingsCount = await prisma.building.count({
      where: { status: 'ACTIVE', deletedAt: null },
    })

    const roomsCount = await prisma.room.count({
      where: { deletedAt: null, building: { deletedAt: null } },
    })

    const activeRoomsCount = await prisma.room.count({
      where: { deletedAt: null, building: { status: 'ACTIVE', deletedAt: null } },
    })

    const todayManilaOrdinal = dateKeyToOrdinal(toManilaDateKey(new Date()))
    const todayWeekday = ordinalToWeekday(todayManilaOrdinal)
    const mondayOffset = todayWeekday === 0 ? 6 : todayWeekday - 1
    const weekStartOrdinal = todayManilaOrdinal - mondayOffset
    const weekEndOrdinal = weekStartOrdinal + (WEEKDAY_COUNT - 1)

    const fetchWeekBookings = async (startOrdinal: number, endOrdinal: number) => {
      const startDate = new Date(startOrdinal * 86400000)
      const endDate = new Date((endOrdinal + 1) * 86400000 - 1)

      const bookings = await prisma.booking.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          approvalStatus: 'CONFIRMED',
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          room: { deletedAt: null, building: { status: 'ACTIVE', deletedAt: null } },
        },
        select: {
          bookingReference: true,
          roomId: true,
          startDate: true,
          endDate: true,
          dailyTimeStart: true,
          dailyTimeEnd: true,
          bookingType: true,
          room: { select: { roomName: true, building: { select: { buildingName: true } } } },
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
    const occupancyWindowLabel: DashboardStats['occupancyWindowLabel'] =
      occupancyWindow.startOrdinal === weekStartOrdinal ? 'THIS_WEEK' : 'NEXT_WEEK'

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
          if (dayOrdinal === bookingStartOrdinal) dayStartMinute = toManilaMinutes(booking.startDate)
          if (dayOrdinal === bookingEndOrdinal) dayEndMinute = toManilaMinutes(booking.endDate)
        }

        const clamped = clampRange(dayStartMinute, dayEndMinute, BUSINESS_START_MINUTE, BUSINESS_END_MINUTE)
        if (!clamped) continue

        const [effectiveStart, effectiveEnd] = clamped
        const roomDayKey = `${booking.roomId}:${dayOrdinal}`
        const occupiedMinutes = occupiedMinutesByRoomDay.get(roomDayKey) ?? new Set<number>()
        for (let minute = effectiveStart; minute < effectiveEnd; minute++) occupiedMinutes.add(minute)
        occupiedMinutesByRoomDay.set(roomDayKey, occupiedMinutes)
      }
    }

    const totalBookedMinutes = Array.from(occupiedMinutesByRoomDay.values()).reduce(
      (total, occupiedMinutes) => total + Math.min(occupiedMinutes.size, BUSINESS_MINUTES_PER_DAY),
      0,
    )

    const totalBookedHours = totalBookedMinutes / 60
    const totalAvailableHours = activeRoomsCount * WEEKDAY_COUNT * (BUSINESS_MINUTES_PER_DAY / 60)
    const rawOccupancyRate = totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0
    const occupancyRate = parseFloat(rawOccupancyRate.toFixed(2))

    const result: GetDashboardStatsResult = {
      success: true,
      data: {
        pendingBookings: pendingCount,
        activeBuildings: buildingsCount,
        totalRooms: roomsCount,
        occupancyRate,
        occupancyWindowLabel,
      },
    }

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 60 })
      } catch (error) {
        console.error('Get dashboard stats cache write error:', error)
      }
    }

    return result
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats.'
    console.error('Get dashboard stats error:', message)
    return { success: false, error: message }
  }
}

// ---------------------- GET RECENT BOOKINGS ----------------------
export async function getRecentBookings(): Promise<GetRecentBookingsResult> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

    const todayKey = toManilaDateKey(new Date())
    const runtimeVersion = await getDashboardCacheVersion()
    const cacheKey = `dashboard:recent:${getCacheContextKey(todayKey, runtimeVersion)}`
    if (redis) {
      try {
        const cached = await redis.get<GetRecentBookingsResult>(cacheKey)
        if (cached) return cached
      } catch (error) {
        console.error('Get recent bookings cache read error:', error)
      }
    }

    const bookings = await prisma.booking.findMany({
      where: { isActive: true, deletedAt: null },
      include: { 
        submittedBy: { 
          select: { 
            name: true, 
            company: { 
              select: { name: true } 
            } 
          } 
        },
        room: { select: { roomName: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    })

    const formatted: RecentBooking[] = bookings.map((booking: any) => ({
      id: booking.id,
      bookingReference: booking.bookingReference,
      submittedByName: booking.submittedBy.name,
      submittedByCompany: booking.submittedBy.company?.name || null,
      roomName: booking.room.roomName,
      date: booking.startDate.toISOString(),
      approvalStatus: booking.approvalStatus,
    }))

    const result: GetRecentBookingsResult = { success: true, data: formatted }

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 60 })
      } catch (error) {
        console.error('Get recent bookings cache write error:', error)
      }
    }

    return result
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recent bookings.'
    console.error('Get recent bookings error:', message)
    return { success: false, error: message }
  }
}

// ---------------------- GET TODAY BOOKINGS PER LOCATION ----------------------
export async function getTodayBookingsPerLocation(): Promise<GetTodayBookingsPerLocationResult> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

    const now = new Date()
    const todayParts = MANILA_DATE_FORMATTER.formatToParts(now)
    const todayKey = `${todayParts.find(p => p.type==='year')?.value}-${todayParts.find(p => p.type==='month')?.value}-${todayParts.find(p => p.type==='day')?.value}`
    const runtimeVersion = await getDashboardCacheVersion()
    const cacheKey = `dashboard:today-by-location:${getCacheContextKey(todayKey, runtimeVersion)}`

    if (redis) {
      try {
        const cached = await redis.get<GetTodayBookingsPerLocationResult>(cacheKey)
        if (cached) return cached
      } catch (error) {
        console.error('Get today bookings per location cache read error:', error)
      }
    }

    const todayStart = new Date(`${todayKey}T00:00:00+08:00`)
    const todayEnd = new Date(`${todayKey}T23:59:59.999+08:00`)

    const bookings = await prisma.booking.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
        room: { deletedAt: null, building: { status: 'ACTIVE', deletedAt: null } }
      },
      select: {
        room: { select: { building: { select: { buildingName: true } } } }
      }
    })

    const locationMap: Record<'GW1'|'GW2'|'GW3'|'GW4', number> = { GW1:0, GW2:0, GW3:0, GW4:0 }
    for (const booking of bookings) {
      const name = booking.room.building.buildingName as keyof typeof locationMap
      if (locationMap[name] !== undefined) locationMap[name] += 1
    }

    const data = Object.entries(locationMap).map(([location, total]) => ({ location: location as 'GW1'|'GW2'|'GW3'|'GW4', total }))
    const result: GetTodayBookingsPerLocationResult = { success: true, data }

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 60 })
      } catch (error) {
        console.error('Get today bookings per location cache write error:', error)
      }
    }

    return result
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch today bookings.'
    console.error('Get today bookings error:', message)
    return { success: false, error: message }
  }
}

export async function getBookingAnalytics(period: DashboardPeriod): Promise<GetBookingAnalyticsResult> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

    const todayKey = toManilaDateKey(new Date())
    const runtimeVersion = await getDashboardCacheVersion()
    const cacheKey = `dashboard:analytics:${period}:${getCacheContextKey(todayKey, runtimeVersion)}`

    if (redis) {
      try {
        const cached = await redis.get<GetBookingAnalyticsResult>(cacheKey)
        if (cached) return cached
      } catch (error) {
        console.error('Get booking analytics cache read error:', error)
      }
    }

    const activeRoomsCount = await prisma.room.count({
      where: { deletedAt: null, building: { status: 'ACTIVE', deletedAt: null } },
    })

    const todayOrdinal = dateKeyToOrdinal(todayKey)
    let rangeStartOrdinal = todayOrdinal
    let rangeEndOrdinal = todayOrdinal
    let labels: string[] = []

    if (period === 'weekly') {
      const weekday = ordinalToWeekday(todayOrdinal)
      const mondayOffset = weekday === 0 ? 6 : weekday - 1
      rangeStartOrdinal = todayOrdinal - mondayOffset
      rangeEndOrdinal = rangeStartOrdinal + 4
      labels = Array.from({ length: 5 }, (_, index) => getDayNameFromOrdinal(rangeStartOrdinal + index))
    } else {
      const [year, month] = todayKey.split('-').map(Number)
      rangeStartOrdinal = Math.floor(Date.UTC(year, month - 1, 1) / 86400000)
      rangeEndOrdinal = Math.floor(Date.UTC(year, month, 0) / 86400000)
      const dayCount = rangeEndOrdinal - rangeStartOrdinal + 1
      const weekBucketCount = Math.ceil(dayCount / 7)
      labels = Array.from({ length: weekBucketCount }, (_, index) => `Week ${index + 1}`)
    }

    const { startDate, endDate } = toOrdinalDateBounds(rangeStartOrdinal, rangeEndOrdinal)

    const bookings = await prisma.booking.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        approvalDate: { gte: startDate, lte: endDate },
        room: { deletedAt: null, building: { status: 'ACTIVE', deletedAt: null } },
      },
      select: {
        roomId: true,
        approvalDate: true,
      },
    })

    const bookingCountByBucket = new Map<number, number>()
    const occupiedRoomDaysByBucket = new Map<number, Set<string>>()
    const dayCountByBucket = new Map<number, Set<number>>()

    const resolveBucketIndex = (dayOrdinal: number): number => {
      if (period === 'weekly') {
        return dayOrdinal - rangeStartOrdinal
      }

      const dayOfMonth = Number(toManilaDateKey(new Date(dayOrdinal * 86400000)).split('-')[2])
      return Math.floor((dayOfMonth - 1) / 7)
    }

    for (const booking of bookings) {
      if (!booking.approvalDate) continue

      const approvalOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.approvalDate))
      if (approvalOrdinal < rangeStartOrdinal || approvalOrdinal > rangeEndOrdinal) continue

      const dayOfWeek = ordinalToWeekday(approvalOrdinal)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      const bucketIndex = resolveBucketIndex(approvalOrdinal)
      bookingCountByBucket.set(bucketIndex, (bookingCountByBucket.get(bucketIndex) ?? 0) + 1)

      const occupiedRoomDays = occupiedRoomDaysByBucket.get(bucketIndex) ?? new Set<string>()
      occupiedRoomDays.add(`${booking.roomId}:${approvalOrdinal}`)
      occupiedRoomDaysByBucket.set(bucketIndex, occupiedRoomDays)

      const bucketDays = dayCountByBucket.get(bucketIndex) ?? new Set<number>()
      bucketDays.add(approvalOrdinal)
      dayCountByBucket.set(bucketIndex, bucketDays)
    }

    const data: DashboardAnalyticsPoint[] = labels.map((name, index) => {
      const bookingsCount = bookingCountByBucket.get(index) ?? 0
      const occupiedRoomDays = occupiedRoomDaysByBucket.get(index)?.size ?? 0
      const activeDaysInBucket = dayCountByBucket.get(index)?.size ?? (period === 'weekly' ? 1 : 7)
      const availableRoomDays = Math.max(1, activeRoomsCount * activeDaysInBucket)
      const occupancy = Number(((occupiedRoomDays / availableRoomDays) * 100).toFixed(2))

      return {
        name,
        bookings: bookingsCount,
        occupancy,
      }
    })

    const result: GetBookingAnalyticsResult = { success: true, data }

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 300 })
      } catch (error) {
        console.error('Get booking analytics cache write error:', error)
      }
    }

    return result
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch booking analytics.'
    console.error('Get booking analytics error:', message)
    return { success: false, error: message }
  }
}
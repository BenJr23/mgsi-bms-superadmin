'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'

const CALENDAR_CACHE_VERSION = 'v3'
const CALENDAR_CACHE_TTL_SECONDS = 300 // 5 minutes for better performance
const BUILDINGS_CACHE_TTL_SECONDS = 3600 // 1 hour for buildings (rarely changes)

function normalizeCalendarApprovalStatus(status: string): string {
    switch (status) {
        case 'APPROVED':
            return 'CONFIRMED'
        case 'REJECTED':
            return 'RESCHEDULED'
        default:
            return status
    }
}

function getCalendarCacheKey(params: { year: number; month: number; buildingId?: string }) {
    const buildingKey = params.buildingId && params.buildingId !== 'all' ? params.buildingId : 'all'
    return `calendar:${CALENDAR_CACHE_VERSION}:${params.year}:${params.month}:${buildingKey}`
}

function getCalendarBuildingsCacheKey() {
    return `calendar:buildings:${CALENDAR_CACHE_VERSION}`
}

// Cache warming function for adjacent months (previous and next)
async function warmAdjacentCache(currentYear: number, currentMonth: number, buildingId?: string) {
    if (!redis) return
    
    const adjacentMonths = [
        { year: currentMonth === 0 ? currentYear - 1 : currentYear, month: currentMonth === 0 ? 11 : currentMonth - 1 },
        { year: currentMonth === 11 ? currentYear + 1 : currentYear, month: currentMonth === 11 ? 0 : currentMonth + 1 }
    ]
    
    // Warm cache for adjacent months in parallel without recursion
    // Use a direct DB query approach to avoid infinite loops
    try {
        const promises = adjacentMonths.map(async ({ year, month }) => {
            const cacheKey = getCalendarCacheKey({ year, month, buildingId })
            const startOfMonth = new Date(year, month, 1)
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

            const bookings = await prisma.booking.findMany({
                where: {
                    isActive: true,
                    deletedAt: null,
                    ...(buildingId && buildingId !== 'all' ? { buildingId } : {}),
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
                select: {
                    id: true,
                    bookingReference: true,
                    startDate: true,
                    endDate: true,
                    dailyTimeStart: true,
                    dailyTimeEnd: true,
                    approvalStatus: true,
                    room: { select: { roomName: true } },
                    building: { select: { id: true, buildingName: true } },
                    walkInCustomer: {
                        select: {
                            name: true,
                            companyName: true,
                        },
                    },
                    submittedBy: { 
                        select: { 
                            name: true, 
                            company: { 
                                select: { name: true } 
                            } 
                        } 
                    },
                },
                orderBy: { startDate: 'asc' },
            })

            const formatted = bookings.map((booking) => {
                const submittedByName = booking.walkInCustomer?.name || booking.submittedBy.name || null
                const companyName = booking.walkInCustomer?.companyName || booking.submittedBy.company?.name || null

                return {
                id: booking.id,
                bookingReference: booking.bookingReference,
                startDate: booking.startDate.toISOString(),
                endDate: booking.endDate.toISOString(),
                dailyTimeStart: booking.dailyTimeStart ? booking.dailyTimeStart.toISOString() : null,
                dailyTimeEnd: booking.dailyTimeEnd ? booking.dailyTimeEnd.toISOString() : null,
                roomName: booking.room.roomName,
                buildingName: booking.building.buildingName,
                buildingId: booking.building.id,
                approvalStatus: normalizeCalendarApprovalStatus(booking.approvalStatus),
                submittedByName,
                companyName,
            }
            })

            const result = { success: true, data: formatted }
            if (redis) {
                await redis.set(cacheKey, JSON.stringify(result), { ex: CALENDAR_CACHE_TTL_SECONDS })
            }
        })

        await Promise.allSettled(promises)
    } catch (error) {
        // Ignore cache warming errors
        console.log('Cache warming failed:', error)
    }
}

export type CalendarBooking = {
    id: string
    bookingReference: string
    startDate: string
    endDate: string
    dailyTimeStart: string | null
    dailyTimeEnd: string | null
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
    month: number,
    buildingId?: string // Optional filter to reduce data over-the-wire
): Promise<GetCalendarBookingsResult> {
    try {
        const session = await getServerSession()
        if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

        const cacheKey = getCalendarCacheKey({ year, month, buildingId })
        const buildingsCacheKey = getCalendarBuildingsCacheKey()

        if (redis) {
            try {
                // Get both cache keys in parallel
                const [cachedResult, cachedBuildings] = await Promise.all([
                    redis.get(cacheKey),
                    redis.get(buildingsCacheKey)
                ])

                if (cachedResult) {
                    try {
                        const calendarData = JSON.parse(cachedResult as string)
                        if (calendarData?.success) {
                            // Get buildings data if available
                            let buildingsData = null
                            if (cachedBuildings) {
                                try {
                                    buildingsData = JSON.parse(cachedBuildings as string)
                                } catch {
                                    // Invalid buildings cache, will fetch from DB
                                }
                            }
                            
                            return {
                                ...calendarData,
                                buildings: buildingsData || calendarData.buildings
                            }
                        }
                    } catch {
                        // Invalid calendar cache format, fall back to DB
                    }
                }
            } catch {
                // Ignore cache errors and fall back to DB
            }
        }

        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

        // Use Promise.all for parallel execution
        const [bookings, cachedBuildings] = await Promise.all([
            // Query 1: Fetch Bookings
            prisma.booking.findMany({
                where: {
                    isActive: true,
                    deletedAt: null,
                    // If a buildingId is provided, filter at the DB level
                    ...(buildingId && buildingId !== 'all' ? { buildingId } : {}),
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
                // OPTIMIZATION: Use 'select' to only pull necessary columns
                select: {
                    id: true,
                    bookingReference: true,
                    startDate: true,
                    endDate: true,
                    dailyTimeStart: true,
                    dailyTimeEnd: true,
                    approvalStatus: true,
                    room: { select: { roomName: true } },
                    building: { select: { id: true, buildingName: true } },
                    walkInCustomer: {
                        select: {
                            name: true,
                            companyName: true,
                        },
                    },
                    submittedBy: { 
                        select: { 
                            name: true, 
                            company: { 
                                select: { name: true } 
                            } 
                        } 
                    },
                },
                orderBy: { startDate: 'asc' },
            }),
            // Get cached buildings in parallel
            (async () => {
                if (!redis) return null
                try {
                    return await redis.get(buildingsCacheKey)
                } catch {
                    return null
                }
            })()
        ])

        // Only query buildings if not cached
        const buildingsQuery = cachedBuildings ? Promise.resolve(null) : prisma.building.findMany({
            where: { deletedAt: null },
            select: { id: true, buildingName: true },
            orderBy: { buildingName: 'asc' },
        })

        const filterBuildings = await buildingsQuery

        const formatted: CalendarBooking[] = bookings.map((booking) => {
            const submittedByName = booking.walkInCustomer?.name || booking.submittedBy.name || null
            const companyName = booking.walkInCustomer?.companyName || booking.submittedBy.company?.name || null

            return {
            id: booking.id,
            bookingReference: booking.bookingReference,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            dailyTimeStart: booking.dailyTimeStart ? booking.dailyTimeStart.toISOString() : null,
            dailyTimeEnd: booking.dailyTimeEnd ? booking.dailyTimeEnd.toISOString() : null,

            roomName: booking.room.roomName,
            buildingName: booking.building.buildingName,
            buildingId: booking.building.id,
            approvalStatus: normalizeCalendarApprovalStatus(booking.approvalStatus),
            submittedByName,
            companyName,
        }
        })

        const buildingsForUi: BuildingFilterOption[] =
            (cachedBuildings as BuildingFilterOption[] | null) ?? (filterBuildings?.map((b) => ({ id: b.id, name: b.buildingName })) ?? [])

        const result: GetCalendarBookingsResult = {
            success: true,
            data: formatted,
            buildings: buildingsForUi,
        }

        if (redis) {
            try {
                // Use pipeline for batch cache writes with different TTLs
                const pipeline = redis.pipeline()
                pipeline.set(cacheKey, JSON.stringify(result), { ex: CALENDAR_CACHE_TTL_SECONDS })
                pipeline.set(buildingsCacheKey, JSON.stringify(buildingsForUi), { ex: BUILDINGS_CACHE_TTL_SECONDS })
                await pipeline.exec()

                // Cache warm adjacent months in background (non-blocking)
                setTimeout(() => {
                    warmAdjacentCache(year, month, buildingId).catch(() => {})
                }, 100) // Delay to not block the response
            } catch {
                // Ignore cache write errors
            }
        }

        return result

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch calendar bookings.'
        console.error('Get calendar bookings error:', message)
        return { success: false, error: message }
    }
}
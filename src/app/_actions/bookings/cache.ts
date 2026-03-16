import { redis } from '@/lib/redist'

export const BOOKINGS_CACHE_TTL_SECONDS = 180

const BOOKINGS_CACHE_VERSION_KEY = 'bookings:list:version'

export function getBookingsCacheKey(
    page: number,
    pageSize: number,
    version: number,
    companyId?: string,
    buildingId?: string,
    roomId?: string,
    month?: string,
    status?: string,
    query?: string
): string {
    const filters = []
    if (companyId) filters.push(`company:${companyId}`)
    if (buildingId) filters.push(`building:${buildingId}`)
    if (roomId) filters.push(`room:${roomId}`)
    if (month) filters.push(`month:${month}`)
    if (status && status !== 'ALL') filters.push(`status:${status}`)
    if (query) filters.push(`query:${query.toLowerCase()}`)
    const filterPart = filters.length > 0 ? `:${filters.join(':')}` : ''
    return `bookings:list:v${version}:page:${page}:size:${pageSize}${filterPart}`
}

export async function getBookingsCacheVersion(): Promise<number> {
    if (!redis) {
        return 0
    }

    try {
        const version = await redis.get<number>(BOOKINGS_CACHE_VERSION_KEY)
        return typeof version === 'number' && Number.isFinite(version) ? version : 0
    } catch (error) {
        console.error('Get bookings cache version error:', error)
        return 0
    }
}

export async function invalidateBookingsCache(): Promise<void> {
    if (!redis) {
        return
    }

    try {
        await redis.incr(BOOKINGS_CACHE_VERSION_KEY)
    } catch (error) {
        console.error('Invalidate bookings cache error:', error)
    }
}
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'
import type { GetBuildingsResult } from './types'

const BUILDINGS_CACHE_KEY = 'buildings:list'
const BUILDINGS_CACHE_TTL_SECONDS = 600

export async function getBuildings(): Promise<GetBuildingsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        if (redis) {
            try {
                const cached = await redis.get<GetBuildingsResult>(BUILDINGS_CACHE_KEY)
                if (cached?.success && cached?.data) {
                    return cached
                }
            } catch (error) {
                console.error('Redis get buildings cache error:', error)
            }
        }

        const buildings = await prisma.building.findMany({
            where: {
                deletedAt: null,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                buildingName: true,
                buildingCode: true,
                status: true,
            },
            orderBy: { buildingName: 'asc' },
        })

        const result: GetBuildingsResult = {
            success: true,
            data: buildings,
        }

        if (redis) {
            try {
                await redis.set(BUILDINGS_CACHE_KEY, result, { ex: BUILDINGS_CACHE_TTL_SECONDS })
            } catch (error) {
                console.error('Redis set buildings cache error:', error)
            }
        }

        return result
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch buildings.'
        console.error('Get buildings error:', message)
        return { success: false, error: message }
    }
}
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'
import type { GetRoomsByBuildingInput, GetRoomsResult } from './types'

const ROOMS_CACHE_KEY_PREFIX = 'rooms:building:'
const ROOMS_CACHE_TTL_SECONDS = 600

export async function getRoomsByBuilding(input: GetRoomsByBuildingInput): Promise<GetRoomsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const { buildingId } = input

        if (!buildingId?.trim()) {
            return { success: false, error: 'Building ID is required.' }
        }

        const cacheKey = `${ROOMS_CACHE_KEY_PREFIX}${buildingId}`

        if (redis) {
            try {
                const cached = await redis.get<GetRoomsResult>(cacheKey)
                if (cached?.success && cached?.data) {
                    return cached
                }
            } catch (error) {
                console.error('Redis get rooms cache error:', error)
            }
        }

        const rooms = await prisma.room.findMany({
            where: {
                buildingId,
                deletedAt: null,
                status: 'AVAILABLE',
            },
            select: {
                id: true,
                roomName: true,
                roomCode: true,
                capacity: true,
                status: true,
                buildingId: true,
            },
            orderBy: { roomName: 'asc' },
        })

        const result: GetRoomsResult = {
            success: true,
            data: rooms,
        }

        if (redis) {
            try {
                await redis.set(cacheKey, result, { ex: ROOMS_CACHE_TTL_SECONDS })
            } catch (error) {
                console.error('Redis set rooms cache error:', error)
            }
        }

        return result
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch rooms.'
        console.error('Get rooms error:', message)
        return { success: false, error: message }
    }
}
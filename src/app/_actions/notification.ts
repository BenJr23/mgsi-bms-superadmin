    'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/get-server'

interface GetNotificationCountResult {
    success: boolean
    count?: number
    latestBookings?: any[]
    error?: string
}

export async function getNotificationCount(): Promise<GetNotificationCountResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const [count, latestBookings] = await Promise.all([
            prisma.booking.count({
                where: {
                    isActive: true,
                    deletedAt: null,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                },
            }),
            prisma.booking.findMany({
                where: {
                    isActive: true,
                    deletedAt: null,
                },
                take: 5,
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    submittedBy: {
                        select: { name: true }
                    },
                    room: {
                        select: { roomName: true }
                    },
                    building: {
                        select: { buildingName: true }
                    }
                }
            })
        ])

        return {
            success: true,
            count,
            latestBookings: JSON.parse(JSON.stringify(latestBookings)),
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch notifications.'
        console.error('Notification count error:', message)
        return { success: false, error: message }
    }
}
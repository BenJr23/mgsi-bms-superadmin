    'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/get-server'

export type NotificationBookingItem = {
    id: string
    createdAt: string
    submittedBy: {
        name: string | null
    } | null
    room: {
        roomName: string
    } | null
    building: {
        buildingName: string
    } | null
}

interface GetNotificationCountResult {
    success: boolean
    count?: number
    latestBookings?: NotificationBookingItem[]
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
                // Select only fields used by the header dropdown to avoid enum decode mismatches.
                select: {
                    id: true,
                    createdAt: true,
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

        const latestBookingsForUi: NotificationBookingItem[] = latestBookings.map((booking) => ({
            id: booking.id,
            createdAt: booking.createdAt.toISOString(),
            submittedBy: booking.submittedBy ? { name: booking.submittedBy.name } : null,
            room: booking.room ? { roomName: booking.room.roomName } : null,
            building: booking.building ? { buildingName: booking.building.buildingName } : null,
        }))

        return {
            success: true,
            count,
            latestBookings: latestBookingsForUi,
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch notifications.'
        console.error('Notification count error:', message)
        return { success: false, error: message }
    }
}
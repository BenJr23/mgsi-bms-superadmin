'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/get-server'

interface CreateRoomInput {
  roomName: string
  roomCode?: string
  buildingId: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
  description?: string
  imageUrl?: string
  amenities?: string[]
}

interface CreateRoomResult {
  success: boolean
  data?: {
    id: string
    roomName: string
    roomCode?: string
  }
  error?: string
}

export async function createRoom(
  input: CreateRoomInput
): Promise<CreateRoomResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    // Validate required fields
    if (!input.roomName?.trim()) {
      return { success: false, error: 'Room name is required.' }
    }

    if (!input.buildingId?.trim()) {
      return { success: false, error: 'Building is required.' }
    }

    if (!input.capacity || input.capacity < 1) {
      return { success: false, error: 'Capacity must be at least 1.' }
    }

    // Verify building exists
    const building = await prisma.building.findUnique({
      where: { id: input.buildingId },
    })

    if (!building) {
      return { success: false, error: 'Building not found.' }
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        roomName: input.roomName.trim(),
        roomCode: input.roomCode?.trim()?.toUpperCase() || null,
        buildingId: input.buildingId,
        capacity: input.capacity,
        status: input.status,
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        amenities: input.amenities && input.amenities.length > 0 ? input.amenities : undefined,
        createdById: session.user.id,
      },
    })

    return {
      success: true,
      data: {
        id: room.id,
        roomName: room.roomName,
        roomCode: room.roomCode || undefined,
      },
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create room.'
    console.error('Create room error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

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

interface GetAllRoomsResult {
  success: boolean
  data?: Array<{
    id: string
    roomName: string
    roomCode: string | null
    capacity: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
    amenities: string[] | null
    building: {
      id: string
      buildingName: string
    }
  }>
  error?: string
}

export async function getAllRooms(): Promise<GetAllRoomsResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        roomName: true,
        roomCode: true,
        capacity: true,
        status: true,
        amenities: true,
        building: {
          select: {
            id: true,
            buildingName: true,
          },
        },
      },
      orderBy: {
        roomName: 'asc',
      },
    })

    return { success: true, data: rooms as GetAllRoomsResult['data'] }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch rooms.'
    console.error('Get all rooms error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

interface GetRoomByIdResult {
  success: boolean
  data?: {
    id: string
    roomName: string
    roomCode: string | null
    capacity: number
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
    description: string | null
    imageUrl: string | null
    amenities: string[] | null
    buildingId: string
    building: {
      id: string
      buildingName: string
    }
  }
  error?: string
}

export async function getRoomById(roomId: string): Promise<GetRoomByIdResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        roomName: true,
        roomCode: true,
        capacity: true,
        status: true,
        description: true,
        imageUrl: true,
        amenities: true,
        buildingId: true,
        building: {
          select: {
            id: true,
            buildingName: true,
          },
        },
      },
    })

    if (!room) {
      return { success: false, error: 'Room not found.' }
    }

    return { success: true, data: room }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch room.'
    console.error('Get room by id error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

interface UpdateRoomInput {
  roomName: string
  roomCode?: string
  buildingId: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
  description?: string
  imageUrl?: string
  amenities?: string[]
}

interface UpdateRoomResult {
  success: boolean
  data?: {
    id: string
    roomName: string
    roomCode?: string
  }
  error?: string
}

export async function updateRoom(
  roomId: string,
  input: UpdateRoomInput
): Promise<UpdateRoomResult> {
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

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    if (!room) {
      return { success: false, error: 'Room not found.' }
    }

    // Verify building exists
    const building = await prisma.building.findUnique({
      where: { id: input.buildingId },
    })

    if (!building) {
      return { success: false, error: 'Building not found.' }
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        roomName: input.roomName.trim(),
        roomCode: input.roomCode?.trim()?.toUpperCase() || null,
        buildingId: input.buildingId,
        capacity: input.capacity,
        status: input.status,
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        amenities: input.amenities && input.amenities.length > 0 ? input.amenities : undefined,
      },
    })

    return {
      success: true,
      data: {
        id: updatedRoom.id,
        roomName: updatedRoom.roomName,
        roomCode: updatedRoom.roomCode || undefined,
      },
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update room.'
    console.error('Update room error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

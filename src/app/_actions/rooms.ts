'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/lib/get-server'

const normalizeAmenities = (amenities: unknown): string[] | null => {
  if (!Array.isArray(amenities)) return null
  const values = amenities.filter((a): a is string => typeof a === 'string')
  return values.length > 0 ? values : null
}

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
    const building = await prisma.building.findFirst({
      where: {
        id: input.buildingId,
        deletedAt: null,
      },
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

interface GetAllRoomsInput {
  page?: number
  pageSize?: number
  searchQuery?: string
  buildingId?: string
}

interface GetAllRoomsResult {
  success: boolean
  data?: {
    rooms: Array<{
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
    pagination: {
      page: number
      pageSize: number
      totalItems: number
      totalPages: number
    }
  }
  error?: string
}

export async function getAllRooms(
  input: GetAllRoomsInput = {}
): Promise<GetAllRoomsResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 10))
    const skip = (page - 1) * pageSize
    const searchQuery = input.searchQuery?.trim()

    const whereClause = {
      deletedAt: null,
      building: {
        deletedAt: null,
      },
      ...(input.buildingId
        ? {
            buildingId: input.buildingId,
          }
        : {}),
      ...(searchQuery
        ? {
            OR: [
              {
                roomName: {
                  contains: searchQuery,
                  mode: 'insensitive' as const,
                },
              },
              {
                roomCode: {
                  contains: searchQuery,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    }

    const [totalItems, rooms] = await Promise.all([
      prisma.room.count({
        where: whereClause,
      }),
      prisma.room.findMany({
        where: whereClause,
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
        skip,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    const normalizedRooms = rooms.map((room) => ({
      ...room,
      amenities: normalizeAmenities(room.amenities),
    }))

    return {
      success: true,
      data: {
        rooms: normalizedRooms,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    }
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

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        building: {
          deletedAt: null,
        },
      },
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

    return {
      success: true,
      data: {
        ...room,
        amenities: normalizeAmenities(room.amenities),
      },
    }
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
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
      },
    })

    if (!room) {
      return { success: false, error: 'Room not found.' }
    }

    // Verify building exists
    const building = await prisma.building.findFirst({
      where: {
        id: input.buildingId,
        deletedAt: null,
      },
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

interface DeleteRoomResult {
  success: boolean
  error?: string
}

interface UploadRoomImageResult {
  success: boolean
  image?: string
  error?: string
}

export async function uploadRoomImage(
  formData: FormData
): Promise<UploadRoomImageResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const file = formData.get('file') as File

    if (!file) {
      return { success: false, error: 'No file provided.' }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please select a valid image file.' }
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Please select an image smaller than 5MB.' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'Supabase configuration missing.' }
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const fileExt = file.type.split('/')[1]
    const fileName = `rooms/${session.user.id}/room-${Date.now()}.${fileExt}`

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    const { error: uploadError } = await supabase.storage
      .from('BMS')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload room image error:', uploadError)
      return { success: false, error: 'Failed to upload image.' }
    }

    const { data: publicUrlData } = supabase.storage.from('BMS').getPublicUrl(fileName)

    return {
      success: true,
      image: publicUrlData.publicUrl,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload room image.'
    console.error('Upload room image error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

export async function deleteRoom(roomId: string): Promise<DeleteRoomResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    if (!roomId?.trim()) {
      return { success: false, error: 'Room ID is required.' }
    }

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!room) {
      return { success: false, error: 'Room not found.' }
    }

    await prisma.room.update({
      where: { id: roomId },
      data: {
        deletedAt: new Date(),
      },
    })

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete room.'
    console.error('Delete room error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

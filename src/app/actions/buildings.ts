'use server'

import { prisma } from '@/lib/prisma'
import { BuildingStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'

interface CreateBuildingInput {
  buildingName: string
  buildingCode: string
  address?: string
  description?: string
  imageUrl?: string
  status: BuildingStatus
}

interface CreateBuildingResult {
  success: boolean
  data?: {
    id: string
    buildingName: string
    buildingCode: string
  }
  error?: string
}

interface GetBuildingsResult {
  success: boolean
  data?: Array<{
    id: string
    buildingName: string
  }>
  error?: string
}

export async function createBuilding(
  input: CreateBuildingInput,
  userId: string
): Promise<CreateBuildingResult> {
  try {
    // Validate required fields
    if (!input.buildingName?.trim()) {
      return { success: false, error: 'Building name is required.' }
    }
    if (!input.buildingCode?.trim()) {
      return { success: false, error: 'Building code is required.' }
    }
    if (!userId) {
      return { success: false, error: 'User authentication required.' }
    }

    // Check for duplicate building code
    const existingBuilding = await prisma.building.findUnique({
      where: { buildingCode: input.buildingCode.toUpperCase() },
    })

    if (existingBuilding) {
      return {
        success: false,
        error: `Building code "${input.buildingCode}" already exists.`,
      }
    }

    // Create building
    const building = await prisma.building.create({
      data: {
        buildingName: input.buildingName.trim(),
        buildingCode: input.buildingCode.toUpperCase(),
        address: input.address?.trim() || null,
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        status: input.status,
        createdById: userId,
      },
    })

    return {
      success: true,
      data: {
        id: building.id,
        buildingName: building.buildingName,
        buildingCode: building.buildingCode,
      },
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create building.'
    console.error('Create building error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

export async function getBuildings(): Promise<GetBuildingsResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const buildings = await prisma.building.findMany({
      select: {
        id: true,
        buildingName: true,
      },
      orderBy: {
        buildingName: 'asc',
      },
    })

    return { success: true, data: buildings }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch buildings.'
    console.error('Get buildings error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

interface GetAllBuildingsResult {
  success: boolean
  data?: Array<{
    id: string
    buildingName: string
    buildingCode: string
    address: string | null
    description: string | null
    imageUrl: string | null
    status: BuildingStatus
    roomCount: number
    createdAt: Date
  }>
  error?: string
}

interface GetBuildingByIdResult {
  success: boolean
  data?: {
    id: string
    buildingName: string
    buildingCode: string
    address: string | null
    description: string | null
    imageUrl: string | null
    status: BuildingStatus
  }
  error?: string
}

export async function getBuildingById(
  buildingId: string
): Promise<GetBuildingByIdResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: {
        id: true,
        buildingName: true,
        buildingCode: true,
        address: true,
        description: true,
        imageUrl: true,
        status: true,
      },
    })

    if (!building) {
      return { success: false, error: 'Building not found.' }
    }

    return { success: true, data: building }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch building.'
    console.error('Get building by id error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

interface UpdateBuildingInput {
  buildingName: string
  buildingCode: string
  address?: string
  description?: string
  imageUrl?: string
  status: BuildingStatus
}

interface UpdateBuildingResult {
  success: boolean
  data?: {
    id: string
    buildingName: string
    buildingCode: string
  }
  error?: string
}

export async function updateBuilding(
  buildingId: string,
  input: UpdateBuildingInput
): Promise<UpdateBuildingResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'User authentication required.' }
    }

    // Validate required fields
    if (!input.buildingName?.trim()) {
      return { success: false, error: 'Building name is required.' }
    }
    if (!input.buildingCode?.trim()) {
      return { success: false, error: 'Building code is required.' }
    }

    // Check if building exists
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
    })

    if (!building) {
      return { success: false, error: 'Building not found.' }
    }

    // Check for duplicate building code (if code is being changed)
    if (input.buildingCode.toUpperCase() !== building.buildingCode) {
      const existingBuilding = await prisma.building.findUnique({
        where: { buildingCode: input.buildingCode.toUpperCase() },
      })

      if (existingBuilding) {
        return {
          success: false,
          error: `Building code "${input.buildingCode}" already exists.`,
        }
      }
    }

    // Update building
    const updatedBuilding = await prisma.building.update({
      where: { id: buildingId },
      data: {
        buildingName: input.buildingName.trim(),
        buildingCode: input.buildingCode.toUpperCase(),
        address: input.address?.trim() || null,
        description: input.description?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        status: input.status,
      },
    })

    return {
      success: true,
      data: {
        id: updatedBuilding.id,
        buildingName: updatedBuilding.buildingName,
        buildingCode: updatedBuilding.buildingCode,
      },
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update building.'
    console.error('Update building error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

export async function getAllBuildings(): Promise<GetAllBuildingsResult> {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    const buildings = await prisma.building.findMany({
      select: {
        id: true,
        buildingName: true,
        buildingCode: true,
        address: true,
        description: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        rooms: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        buildingName: 'asc',
      },
    })

    const buildingsWithCount = buildings.map((b) => ({
      id: b.id,
      buildingName: b.buildingName,
      buildingCode: b.buildingCode,
      address: b.address,
      description: b.description,
      imageUrl: b.imageUrl,
      status: b.status,
      createdAt: b.createdAt,
      roomCount: b.rooms.length,
    }))

    return { success: true, data: buildingsWithCount }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch buildings.'
    console.error('Get all buildings error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

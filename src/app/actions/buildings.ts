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

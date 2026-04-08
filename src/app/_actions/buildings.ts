'use server'

import { prisma } from '@/lib/prisma'
import { BuildingStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { redis } from '@/lib/redist'
import { headers } from 'next/headers'
import { createAuditChange, getRequestMetadata, persistAuditLog } from './audit-log-helpers'

const BUILDINGS_CACHE_TTL_SECONDS = 300
const BUILDINGS_CACHE_VERSION_KEY = 'buildings:list:version'
const ROOMS_CACHE_VERSION_KEY = 'rooms:list:version'

function getBuildingsCacheKey(version: number): string {
  return `buildings:list:v${version}`
}

function getBuildingOptionsCacheKey(version: number): string {
  return `buildings:options:v${version}`
}

function getBuildingByIdCacheKey(buildingId: string, version: number): string {
  return `buildings:by-id:${buildingId}:v${version}`
}

async function getCacheVersion(versionKey: string): Promise<number> {
  if (!redis) return 0

  try {
    const version = await redis.get<number>(versionKey)
    return typeof version === 'number' && Number.isFinite(version) ? version : 0
  } catch (error) {
    console.error('Get building cache version error:', error)
    return 0
  }
}

async function invalidateBuildingAndRoomCaches(): Promise<void> {
  if (!redis) return

  try {
    await Promise.all([
      redis.incr(BUILDINGS_CACHE_VERSION_KEY),
      redis.incr(ROOMS_CACHE_VERSION_KEY),
    ])
  } catch (error) {
    console.error('Invalidate building/room cache error:', error)
  }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

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
  input: CreateBuildingInput
): Promise<CreateBuildingResult> {
  try {
    const session = await getServerSession()
    const requestHeaders = await headers()
    const userId = session?.user?.id

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
    const existingBuilding = await prisma.building.findFirst({
      where: {
        buildingCode: input.buildingCode.toUpperCase(),
        deletedAt: null,
      },
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

    await invalidateBuildingAndRoomCaches()

    const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)
    await persistAuditLog({
      action: 'CREATE',
      status: 'SUCCESS',
      module: 'Buildings',
      entityType: 'Building',
      actorId: userId,
      entityId: building.id,
      targetLabel: building.buildingName,
      summary: `Created building ${building.buildingName}`,
      changes: [
        createAuditChange('buildingName', null, building.buildingName),
        createAuditChange('buildingCode', null, building.buildingCode),
        createAuditChange('address', null, building.address),
        createAuditChange('description', null, building.description),
        createAuditChange('imageUrl', null, building.imageUrl),
        createAuditChange('status', null, building.status),
      ],
      ipAddress,
      userAgent,
      requestId,
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

    const cacheVersion = await getCacheVersion(BUILDINGS_CACHE_VERSION_KEY)
    const cacheKey = getBuildingOptionsCacheKey(cacheVersion)

    if (redis) {
      try {
        const cached = await redis.get<GetBuildingsResult>(cacheKey)
        if (cached?.success) {
          return cached
        }
      } catch (error) {
        console.error('Get buildings cache read error:', error)
      }
    }

    const buildings = await prisma.building.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        buildingName: true,
      },
      orderBy: {
        buildingName: 'asc',
      },
    })

    const response: GetBuildingsResult = { success: true, data: buildings }

    if (redis) {
      try {
        await redis.set(cacheKey, response, { ex: BUILDINGS_CACHE_TTL_SECONDS })
      } catch (error) {
        console.error('Get buildings cache write error:', error)
      }
    }

    return response
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

    const cacheVersion = await getCacheVersion(BUILDINGS_CACHE_VERSION_KEY)
    const cacheKey = getBuildingByIdCacheKey(buildingId, cacheVersion)

    if (redis) {
      try {
        const cached = await redis.get<GetBuildingByIdResult>(cacheKey)
        if (cached?.success) {
          return cached
        }
      } catch (error) {
        console.error('Get building by id cache read error:', error)
      }
    }

    const building = await prisma.building.findFirst({
      where: {
        id: buildingId,
        deletedAt: null,
      },
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

    const response: GetBuildingByIdResult = { success: true, data: building }

    if (redis) {
      try {
        await redis.set(cacheKey, response, { ex: BUILDINGS_CACHE_TTL_SECONDS })
      } catch (error) {
        console.error('Get building by id cache write error:', error)
      }
    }

    return response
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
    const requestHeaders = await headers()

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
    const building = await prisma.building.findFirst({
      where: {
        id: buildingId,
        deletedAt: null,
      },
    })

    if (!building) {
      return { success: false, error: 'Building not found.' }
    }

    // Check for duplicate building code (if code is being changed)
    if (input.buildingCode.toUpperCase() !== building.buildingCode) {
      const existingBuilding = await prisma.building.findFirst({
        where: {
          buildingCode: input.buildingCode.toUpperCase(),
          deletedAt: null,
        },
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

    await invalidateBuildingAndRoomCaches()

    const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)
    const changes = [
      createAuditChange('buildingName', building.buildingName, updatedBuilding.buildingName),
      createAuditChange('buildingCode', building.buildingCode, updatedBuilding.buildingCode),
      createAuditChange('address', building.address, updatedBuilding.address),
      createAuditChange('description', building.description, updatedBuilding.description),
      createAuditChange('imageUrl', building.imageUrl, updatedBuilding.imageUrl),
      createAuditChange('status', building.status, updatedBuilding.status),
    ].filter((change) => change.before !== change.after)

    if (changes.length > 0) {
      await persistAuditLog({
        action: 'EDIT',
        status: 'SUCCESS',
        module: 'Buildings',
        entityType: 'Building',
        actorId: session.user.id,
        entityId: updatedBuilding.id,
        targetLabel: updatedBuilding.buildingName,
        summary: `Updated building ${updatedBuilding.buildingName}`,
        changes,
        ipAddress,
        userAgent,
        requestId,
      })
    }

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

    const cacheVersion = await getCacheVersion(BUILDINGS_CACHE_VERSION_KEY)
    const cacheKey = getBuildingsCacheKey(cacheVersion)

    if (redis) {
      try {
        const cached = await redis.get<GetAllBuildingsResult>(cacheKey)
        if (cached?.success && cached.data) {
          return {
            ...cached,
            data: cached.data.map((building) => ({
              ...building,
              createdAt: toDate(building.createdAt),
            })),
          }
        }
      } catch (error) {
        console.error('Get all buildings cache read error:', error)
      }
    }

    const buildings = await prisma.building.findMany({
      where: {
        deletedAt: null,
      },
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
          where: {
            deletedAt: null,
          },
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

    const response: GetAllBuildingsResult = {
      success: true,
      data: buildingsWithCount,
    }

    if (redis) {
      try {
        await redis.set(cacheKey, response, { ex: BUILDINGS_CACHE_TTL_SECONDS })
      } catch (error) {
        console.error('Get all buildings cache write error:', error)
      }
    }

    return response
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

interface DeleteBuildingResult {
  success: boolean
  error?: string
}

interface UploadBuildingImageResult {
  success: boolean
  image?: string
  error?: string
}

export async function uploadBuildingImage(
  formData: FormData
): Promise<UploadBuildingImageResult> {
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
    const fileName = `buildings/${session.user.id}/building-${Date.now()}.${fileExt}`

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    const { error: uploadError } = await supabase.storage
      .from('BMS')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload building image error:', uploadError)
      return { success: false, error: 'Failed to upload image.' }
    }

    const { data: publicUrlData } = supabase.storage.from('BMS').getPublicUrl(fileName)

    return {
      success: true,
      image: publicUrlData.publicUrl,
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload building image.'
    console.error('Upload building image error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

export async function deleteBuilding(
  buildingId: string
): Promise<DeleteBuildingResult> {
  try {
    const session = await getServerSession()
    const requestHeaders = await headers()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated.' }
    }

    if (!buildingId?.trim()) {
      return { success: false, error: 'Building ID is required.' }
    }

    const building = await prisma.building.findFirst({
      where: {
        id: buildingId,
        deletedAt: null,
      },
      select: {
        id: true,
        buildingName: true,
        deletedAt: true,
      },
    })

    if (!building) {
      return { success: false, error: 'Building not found.' }
    }

    const activeRoomsCount = await prisma.room.count({
      where: {
        buildingId,
        deletedAt: null,
      },
    })

    if (activeRoomsCount > 0) {
      return {
        success: false,
        error:
          'Cannot delete building while it still has active rooms. Soft-delete related rooms first.',
      }
    }

    const deletedAt = new Date()

    await prisma.building.update({
      where: { id: buildingId },
      data: {
        deletedAt,
      },
    })

    await invalidateBuildingAndRoomCaches()

    const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)
    await persistAuditLog({
      action: 'DELETE',
      status: 'SUCCESS',
      module: 'Buildings',
      entityType: 'Building',
      actorId: session.user.id,
      entityId: buildingId,
      targetLabel: building.buildingName,
      summary: `Soft deleted building ${building.buildingName}`,
      changes: [createAuditChange('deletedAt', building.deletedAt, deletedAt)],
      ipAddress,
      userAgent,
      requestId,
    })

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete building.'
    console.error('Delete building error:', message)
    return {
      success: false,
      error: message,
    }
  }
}

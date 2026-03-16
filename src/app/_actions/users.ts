'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { hashPassword } from 'better-auth/crypto'
import { sendCredentialsEmail } from './email/email-user'
import { redis } from '@/lib/redist'
import { Prisma } from '@/generated/prisma/client'

interface CreateUserInput {
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'STAFF' | 'SUPERADMIN'
  companyId?: string
  phoneNumber?: string
  contractEndDate?: string
  image?: string
}

interface CreateUserResult {
  success: boolean
  error?: string
  userId?: string
  requiresReactivation?: boolean
  reactivationUserId?: string
}

interface GetUsersInput {
  page?: number
  pageSize?: number
  searchQuery?: string
}

interface ListUsersResult {
  success: boolean
  error?: string
  data?: {
    users: {
      id: string
      name: string
      email: string
      role: 'CLIENT' | 'ADMIN' | 'STAFF' | 'SUPERADMIN'
      company: { id: string; name: string } | null
      phoneNumber: string | null
      contractEndDate: string | null
      image: string | null
      createdAt: string
      deletedAt: string | null
    }[]
    pagination: {
      page: number
      pageSize: number
      totalItems: number
      totalPages: number
    }
  }
}

interface UpdateUserInput {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'STAFF' | 'SUPERADMIN'
  companyId?: string
  phoneNumber?: string
  contractEndDate?: string
  image?: string
}

interface UpdateUserResult {
  success: boolean
  error?: string
}

type AppUserRole = 'CLIENT' | 'ADMIN' | 'STAFF' | 'SUPERADMIN'

function normalizeUserRole(role: string): AppUserRole {
  if (role === 'ADMIN' || role === 'SUPERADMIN' || role === 'CLIENT' || role === 'STAFF') {
    return role
  }
  return 'CLIENT'
}

// Generate a secure random password
function generateSecurePassword(): string {
  const length = 12
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  try {
    // Get session using better-auth api
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session.user.id) {
      return { success: false, error: 'Unauthorized: No session' }
    }

    // Only SUPERADMIN can create users
    if (session.user.role !== 'SUPERADMIN') {
      return { success: false, error: 'Unauthorized: Only SUPERADMIN can create users' }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        deletedAt: true,
      },
    })

    if (existingUser) {
      if (existingUser.deletedAt) {
        return {
          success: false,
          error: 'This email already exists but the account is inactive.',
          requiresReactivation: true,
          reactivationUserId: existingUser.id,
        }
      }

      return { success: false, error: 'Email address is already in use' }
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword()

    // Create user using Prisma directly
    const newUser = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        emailVerified: true,
      },
    })

    // Update user with additional fields
    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: {
        image: input.image || null,
        phoneNumber: input.phoneNumber || null,
        contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null,
        companyId: input.companyId || null,
      },
    })

    // Hash the password using better-auth crypto
    const hashedPassword = await hashPassword(generatedPassword)

    // Create account record with hashed password
    await prisma.account.create({
      data: {
        userId: newUser.id,
        providerId: 'credential',
        accountId: newUser.email,
        password: hashedPassword,
      },
    })

    // Send credentials email
    const emailSent = await sendCredentialsEmail({
      userEmail: newUser.email,
      userName: newUser.name,
      password: generatedPassword,
    })

    if (!emailSent) {
      console.warn(`Email failed to send for user ${newUser.email}, but account was created`)
    }

    // Invalidate cache after successful user creation
    await invalidateUsersCache()

    return {
      success: true,
      userId: updatedUser.id,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error creating user:', message)
    return { success: false, error: message }
  }
}

// Generate cache key for users list
function generateUsersCacheKey(page: number, pageSize: number, searchQuery?: string): string {
  const searchPart = searchQuery ? `:${searchQuery.trim().toLowerCase()}` : ''
  return `users:list:${page}:${pageSize}${searchPart}`
}

// Invalidate all users-related cache
async function invalidateUsersCache(): Promise<void> {
  if (!redis) return
  
  try {
    // Get all keys matching users pattern
    const keys = await redis.keys('users:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Error invalidating users cache:', error)
  }
}

export async function getUsers(input: GetUsersInput = {}): Promise<ListUsersResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session.user.id) {
      return { success: false, error: 'Unauthorized: No session' }
    }

    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 10))
    const searchQuery = input.searchQuery?.trim()
    const cacheKey = generateUsersCacheKey(page, pageSize, searchQuery)

    // Try to get from cache first
    if (redis) {
      try {
        const cachedResult = await redis.get<ListUsersResult>(cacheKey)
        if (cachedResult) {
          return cachedResult
        }
      } catch (error) {
        console.error('Error reading from cache:', error)
      }
    }

    const whereClause = {
      deletedAt: null,
      // Exclude CLIENT users without a contract end date
      NOT: {
        AND: [
          { role: 'CLIENT' as const },
          { contractEndDate: null },
        ],
      },
      ...(searchQuery
        ? {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' as const } },
              { email: { contains: searchQuery, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const offset = (page - 1) * pageSize

    type UserRowRaw = {
      id: string
      name: string
      email: string
      role: string
      companyId: string | null
      companyName: string | null
      phoneNumber: string | null
      contractEndDate: Date | null
      image: string | null
      createdAt: Date
      deletedAt: Date | null
    }

    const searchTerm = searchQuery ? `%${searchQuery}%` : null
    const searchFilter = searchTerm
      ? Prisma.sql`AND (u."name" ILIKE ${searchTerm} OR u."email" ILIKE ${searchTerm})`
      : Prisma.empty

    const [totalItems, users] = await Promise.all([
      prisma.user.count({
        where: whereClause,
      }),
      prisma.$queryRaw<UserRowRaw[]>(Prisma.sql`
        SELECT
          u."id",
          u."name",
          u."email",
          u."role"::text AS "role",
          c."id" AS "companyId",
          c."name" AS "companyName",
          u."phoneNumber",
          u."contractEndDate",
          u."image",
          u."createdAt",
          u."deletedAt"
        FROM "users" u
        LEFT JOIN "companies" c ON c."id" = u."companyId"
        WHERE
          u."deletedAt" IS NULL
          AND NOT (u."role" = 'CLIENT' AND u."contractEndDate" IS NULL)
          ${searchFilter}
        ORDER BY u."createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
    ])

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    const result = {
      success: true,
      data: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizeUserRole(user.role),
          company: user.companyId && user.companyName ? { id: user.companyId, name: user.companyName } : null,
          phoneNumber: user.phoneNumber,
          contractEndDate: user.contractEndDate ? user.contractEndDate.toISOString() : null,
          image: user.image,
          createdAt: user.createdAt.toISOString(),
          deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
        })),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    }

    // Cache the result for 5 minutes (300 seconds)
    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 300 })
      } catch (error) {
        console.error('Error writing to cache:', error)
      }
    }

    return result
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error fetching users:', message)
    return { success: false, error: message }
  }
}

export async function updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session.user.id) {
      return { success: false, error: 'Unauthorized: No session' }
    }

    if (session.user.role !== 'SUPERADMIN') {
      return { success: false, error: 'Unauthorized: Only SUPERADMIN can update users' }
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: input.id },
      select: { id: true, email: true },
    })

    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    const duplicateEmailUser = await prisma.user.findFirst({
      where: {
        email: input.email,
        NOT: { id: input.id },
      },
      select: { id: true },
    })

    if (duplicateEmailUser) {
      return { success: false, error: 'Email address is already in use' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          image: input.image || null,
          phoneNumber: input.phoneNumber || null,
          contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null,
          companyId: input.companyId || null,
        },
      })

      if (existingUser.email !== input.email) {
        await tx.account.updateMany({
          where: {
            userId: input.id,
            providerId: 'credential',
          },
          data: {
            accountId: input.email,
          },
        })
      }
    })

    // Invalidate cache after successful user update
    await invalidateUsersCache()

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error updating user:', message)
    return { success: false, error: message }
  }
}

interface DeleteUserResult {
  success: boolean
  error?: string
}

export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session.user.id) {
      return { success: false, error: 'Unauthorized: No session' }
    }

    if (session.user.role !== 'SUPERADMIN') {
      return { success: false, error: 'Unauthorized: Only SUPERADMIN can delete users' }
    }

    if (!userId?.trim()) {
      return { success: false, error: 'User ID is required' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
      },
    })

    // Invalidate cache after successful user deletion
    await invalidateUsersCache()

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error deleting user:', message)
    return { success: false, error: message }
  }
}

interface ResetUserPasswordResult {
  success: boolean
  error?: string
  newPassword?: string
}

interface ReactivateUserResult {
  success: boolean
  error?: string
}

export async function reactivateUser(userId: string): Promise<ReactivateUserResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session.user.id) {
      return { success: false, error: 'Unauthorized: No session' }
    }

    if (session.user.role !== 'SUPERADMIN') {
      return { success: false, error: 'Unauthorized: Only SUPERADMIN can reactivate users' }
    }

    if (!userId?.trim()) {
      return { success: false, error: 'User ID is required' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (!user.deletedAt) {
      return { success: false, error: 'User account is already active' }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
      },
    })

    // Invalidate cache after successful user reactivation
    await invalidateUsersCache()

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error reactivating user:', message)
    return { success: false, error: message }
  }
}

export async function resetUserPassword(userId: string): Promise<ResetUserPasswordResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || !session.user.id) {
      return { success: false, error: 'Unauthorized: No session' }
    }

    if (session.user.role !== 'SUPERADMIN') {
      return { success: false, error: 'Unauthorized: Only SUPERADMIN can reset passwords' }
    }

    if (!userId?.trim()) {
      return { success: false, error: 'User ID is required' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Generate new secure password
    const newPassword = generateSecurePassword()

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update the account with new hashed password and user's passwordVerified status
    await prisma.$transaction(async (tx) => {
      await tx.account.updateMany({
        where: {
          userId,
          providerId: 'credential',
        },
        data: {
          password: hashedPassword,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          passwordVerified: false,
        },
      })
    })

    // Send credentials email with new password
    const emailSent = await sendCredentialsEmail({
      userEmail: user.email,
      userName: user.name,
      password: newPassword,
    })

    if (!emailSent) {
      console.warn(`Email failed to send for user ${user.email}, but password was reset`)
    }

    return {
      success: true,
      newPassword,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error resetting user password:', message)
    return { success: false, error: message }
  }
}
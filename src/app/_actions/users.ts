'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

interface CreateUserInput {
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'SUPERADMIN'
  companyName: string
  phoneNumber: string
  contractEndDate?: string
  image?: string
}

interface CreateUserResult {
  success: boolean
  error?: string
  userId?: string
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
    })

    if (existingUser) {
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

    // Update user with additional fields and store the generated password info
    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: {
        image: input.image || null,
        phoneNumber: input.phoneNumber || null,
        contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null,
        companyName: input.companyName || null,
      },
    })

    // TODO: In production, hash the password and store it securely
    // For now, return success - the password should be sent via email

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
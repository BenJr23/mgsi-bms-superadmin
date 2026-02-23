'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { hashPassword } from 'better-auth/crypto'
import nodemailer from 'nodemailer'

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
      role: 'CLIENT' | 'ADMIN' | 'SUPERADMIN'
      companyName: string | null
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
  role: 'CLIENT' | 'ADMIN' | 'SUPERADMIN'
  companyName: string
  phoneNumber: string
  contractEndDate?: string
  image?: string
}

interface UpdateUserResult {
  success: boolean
  error?: string
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

async function sendCredentialsEmail(input: {
  userEmail: string
  userName: string
  password: string
}): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.USER,
      to: input.userEmail,
      subject: 'GreatWork Spaces - Your Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .header {
                background: linear-gradient(135deg, #7c2d12 0%, #b91c1c 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .greeting {
                font-size: 16px;
                margin-bottom: 20px;
              }
              .credentials-box {
                background-color: #f3f4f6;
                border-left: 4px solid #b91c1c;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
              }
              .credentials-box label {
                display: block;
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
                font-weight: bold;
              }
              .credentials-box .value {
                display: block;
                font-size: 14px;
                color: #1f2937;
                margin-bottom: 15px;
                word-break: break-all;
              }
              .credentials-box .value:last-child {
                margin-bottom: 0;
              }
              .important {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
                font-size: 14px;
              }
              .important strong {
                color: #b91c1c;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #666;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #b91c1c;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to GreatWork Spaces</h1>
              </div>
              <div class="content">
                <div class="greeting">
                  <p>Hi <strong>${input.userName}</strong>,</p>
                  <p>Your account has been successfully created. Below are your login credentials:</p>
                </div>

                <div class="credentials-box">
                  <label>Email Address:</label>
                  <span class="value">${input.userEmail}</span>

                  <label>Temporary Password:</label>
                  <span class="value">${input.password}</span>
                </div>

                <div class="important">
                  <strong>Important:</strong>
                  <p>Please keep your credentials safe and secure. We recommend changing your password after your first login. Do not share this email with anyone.</p>
                </div>

                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in" class="button">
                    Sign In to Your Account
                  </a>
                </div>

                <div style="margin-top: 30px; font-size: 13px; color: #666;">
                  <p><strong>Next Steps:</strong></p>
                  <ol>
                    <li>Go to the login page using the link above</li>
                    <li>Enter your email and temporary password</li>
                    <li>Update your profile information if needed</li>
                    <li>Change your password to something secure</li>
                  </ol>
                </div>

                <div class="footer">
                  <p>© 2026 GreatWork Spaces. All rights reserved.</p>
                  <p>If you didn't create this account, please contact support immediately.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
GreatWork Spaces - Your Account Credentials

Hi ${input.userName},

Your account has been successfully created. Below are your login credentials:

Email Address: ${input.userEmail}
Temporary Password: ${input.password}

Important:
Please keep your credentials safe and secure. We recommend changing your password after your first login.

Sign in at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in

© 2026 GreatWork Spaces
      `,
    })

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
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

    // Update user with additional fields
    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: {
        image: input.image || null,
        phoneNumber: input.phoneNumber || null,
        contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : null,
        companyName: input.companyName || null,
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
    const skip = (page - 1) * pageSize
    const searchQuery = input.searchQuery?.trim()

    const whereClause = {
      deletedAt: null,
      ...(searchQuery
        ? {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' as const } },
              { email: { contains: searchQuery, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [totalItems, users] = await Promise.all([
      prisma.user.count({
        where: whereClause,
      }),
      prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          phoneNumber: true,
          contractEndDate: true,
          image: true,
          createdAt: true,
          deletedAt: true,
        },
        skip,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    return {
      success: true,
      data: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
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
          companyName: input.companyName || null,
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
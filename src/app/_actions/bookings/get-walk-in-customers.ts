import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import type { GetWalkInCustomersResult, WalkInCustomerOption } from './types'

export async function getWalkInCustomers(query?: string): Promise<GetWalkInCustomersResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const normalizedQuery = query?.trim()

        const customers = await prisma.walkInCustomer.findMany({
            where: {
                deletedAt: null,
                ...(normalizedQuery
                    ? {
                        OR: [
                            { name: { contains: normalizedQuery, mode: 'insensitive' } },
                            { email: { contains: normalizedQuery, mode: 'insensitive' } },
                            { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } },
                            { companyName: { contains: normalizedQuery, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                companyName: true,
            },
            orderBy: [
                { updatedAt: 'desc' },
                { name: 'asc' },
            ],
            take: 20,
        })

        const data: WalkInCustomerOption[] = customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            companyName: customer.companyName,
        }))

        return { success: true, data }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch walk-in customers.'
        console.error('Get walk-in customers error:', message)
        return { success: false, error: message }
    }
}

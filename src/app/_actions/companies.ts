'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'

export type CompanyStats = {
    id: string
    name: string
    allottedCreditHours: number
    usedCreditHours: number
    remainingCreditHours: number
    utilizationPercentage: number
    approvedBookingsCount: number
    pendingBookingsCount: number
    rejectedBookingsCount: number
    totalBookingsCount: number
    createdAt: string
    updatedAt: string
}

interface GetCompaniesResult {
    success: boolean
    data?: CompanyStats[]
    error?: string
}

interface GetCompanyDetailsResult {
    success: boolean
    data?: CompanyStats & {
        bookings: Array<{
            id: string
            bookingReference: string
            roomName: string
            buildingName: string
            startDate: string
            endDate: string
            approvalStatus: string
            creditHoursUsed: number
        }>
    }
    error?: string
}

const COMPANIES_CACHE_KEY = 'companies:list:stats'
const COMPANY_DETAIL_CACHE_KEY_PREFIX = 'company:detail:'
const CACHE_TTL_SECONDS = 300

async function invalidateCompaniesCache(): Promise<void> {
    if (!redis) return

    try {
        await redis.del(COMPANIES_CACHE_KEY)
    } catch (error) {
        console.error('Failed to invalidate companies cache:', error)
    }
}

async function invalidateCompanyDetailCache(companyId: string): Promise<void> {
    if (!redis) return

    try {
        await redis.del(`${COMPANY_DETAIL_CACHE_KEY_PREFIX}${companyId}`)
    } catch (error) {
        console.error('Failed to invalidate company detail cache:', error)
    }
}

export async function getCompanies(): Promise<GetCompaniesResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        // Try to get from cache first
        if (redis) {
            try {
                const cachedData = await redis.get<CompanyStats[]>(COMPANIES_CACHE_KEY)
                if (cachedData) {
                    return { success: true, data: cachedData }
                }
            } catch (error) {
                console.error('Cache read error:', error)
            }
        }

        // Fetch companies with their stats
        const companies = await prisma.company.findMany({
            where: { deletedAt: null },
            include: {
                bookings: {
                    where: { deletedAt: null },
                    select: {
                        creditHoursUsed: true,
                        approvalStatus: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const companiesStats: CompanyStats[] = companies.map((company) => {
            const approvedBookings = company.bookings.filter((b) => b.approvalStatus === 'APPROVED')
            const pendingBookings = company.bookings.filter((b) => b.approvalStatus === 'PENDING')
            const rejectedBookings = company.bookings.filter((b) => b.approvalStatus === 'REJECTED')

            const totalCreditHoursUsed = approvedBookings.reduce((sum, b) => sum + b.creditHoursUsed, 0)
            const remainingCreditHours = company.allottedCreditHours - totalCreditHoursUsed
            const utilizationPercentage = company.allottedCreditHours > 0
                ? Math.round((totalCreditHoursUsed / company.allottedCreditHours) * 100)
                : 0

            return {
                id: company.id,
                name: company.name,
                allottedCreditHours: company.allottedCreditHours,
                usedCreditHours: totalCreditHoursUsed,
                remainingCreditHours,
                utilizationPercentage,
                approvedBookingsCount: approvedBookings.length,
                pendingBookingsCount: pendingBookings.length,
                rejectedBookingsCount: rejectedBookings.length,
                totalBookingsCount: company.bookings.length,
                createdAt: company.createdAt.toISOString(),
                updatedAt: company.updatedAt.toISOString(),
            }
        })

        // Cache the result
        if (redis) {
            try {
                await redis.set(COMPANIES_CACHE_KEY, companiesStats, { ex: CACHE_TTL_SECONDS })
            } catch (error) {
                console.error('Cache write error:', error)
            }
        }

        return { success: true, data: companiesStats }
    } catch (error) {
        console.error('Get companies error:', error)
        return { success: false, error: 'Failed to fetch companies' }
    }
}

export async function getCompanyDetails(companyId: string): Promise<GetCompanyDetailsResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        // Try cache first
        if (redis) {
            try {
                const cachedData = await redis.get<GetCompanyDetailsResult['data']>(`${COMPANY_DETAIL_CACHE_KEY_PREFIX}${companyId}`)
                if (cachedData) {
                    return { success: true, data: cachedData }
                }
            } catch (error) {
                console.error('Cache read error:', error)
            }
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId, deletedAt: null },
            include: {
                bookings: {
                    where: { deletedAt: null },
                    include: {
                        room: { select: { roomName: true } },
                        building: { select: { buildingName: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
        })

        if (!company) {
            return { success: false, error: 'Company not found' }
        }

        const approvedBookings = company.bookings.filter((b) => b.approvalStatus === 'APPROVED')
        const pendingBookings = company.bookings.filter((b) => b.approvalStatus === 'PENDING')
        const rejectedBookings = company.bookings.filter((b) => b.approvalStatus === 'REJECTED')

        const totalCreditHoursUsed = approvedBookings.reduce((sum, b) => sum + b.creditHoursUsed, 0)
        const remainingCreditHours = company.allottedCreditHours - totalCreditHoursUsed
        const utilizationPercentage = company.allottedCreditHours > 0
            ? Math.round((totalCreditHoursUsed / company.allottedCreditHours) * 100)
            : 0

        const result: GetCompanyDetailsResult['data'] = {
            id: company.id,
            name: company.name,
            allottedCreditHours: company.allottedCreditHours,
            usedCreditHours: totalCreditHoursUsed,
            remainingCreditHours,
            utilizationPercentage,
            approvedBookingsCount: approvedBookings.length,
            pendingBookingsCount: pendingBookings.length,
            rejectedBookingsCount: rejectedBookings.length,
            totalBookingsCount: company.bookings.length,
            createdAt: company.createdAt.toISOString(),
            updatedAt: company.updatedAt.toISOString(),
            bookings: company.bookings.map((booking) => ({
                id: booking.id,
                bookingReference: booking.bookingReference,
                roomName: booking.room.roomName,
                buildingName: booking.building.buildingName,
                startDate: booking.startDate.toISOString(),
                endDate: booking.endDate.toISOString(),
                approvalStatus: booking.approvalStatus,
                creditHoursUsed: booking.creditHoursUsed,
            })),
        }

        // Cache the result
        if (redis) {
            try {
                await redis.set(`${COMPANY_DETAIL_CACHE_KEY_PREFIX}${companyId}`, result, { ex: CACHE_TTL_SECONDS })
            } catch (error) {
                console.error('Cache write error:', error)
            }
        }

        return { success: true, data: result }
    } catch (error) {
        console.error('Get company details error:', error)
        return { success: false, error: 'Failed to fetch company details' }
    }
}

export async function updateCompanyCreditHours(
    companyId: string,
    allottedCreditHours: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        if (allottedCreditHours < 0) {
            return { success: false, error: 'Allotted credit hours cannot be negative' }
        }

        await prisma.company.update({
            where: { id: companyId },
            data: { allottedCreditHours },
        })

        // Invalidate caches
        await invalidateCompaniesCache()
        await invalidateCompanyDetailCache(companyId)

        return { success: true }
    } catch (error) {
        console.error('Update company credit hours error:', error)
        return { success: false, error: 'Failed to update company credit hours' }
    }
}

export async function getCompanyUtilizationReport(): Promise<{
    success: boolean
    data?: {
        totalCompanies: number
        totalAllottedHours: number
        totalUsedHours: number
        totalRemainingHours: number
        averageUtilization: number
        companiesNearLimit: CompanyStats[]
        companiesOverLimit: CompanyStats[]
    }
    error?: string
}> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        const companiesResult = await getCompanies()
        if (!companiesResult.success || !companiesResult.data) {
            return { success: false, error: 'Failed to fetch companies' }
        }

        const companies = companiesResult.data
        const companiesNearLimit = companies.filter((c) => c.utilizationPercentage >= 80 && c.utilizationPercentage < 100)
        const companiesOverLimit = companies.filter((c) => c.utilizationPercentage >= 100)

        const totalAllottedHours = companies.reduce((sum, c) => sum + c.allottedCreditHours, 0)
        const totalUsedHours = companies.reduce((sum, c) => sum + c.usedCreditHours, 0)
        const totalRemainingHours = companies.reduce((sum, c) => sum + c.remainingCreditHours, 0)
        const averageUtilization = companies.length > 0
            ? Math.round((totalUsedHours / totalAllottedHours) * 100)
            : 0

        return {
            success: true,
            data: {
                totalCompanies: companies.length,
                totalAllottedHours,
                totalUsedHours,
                totalRemainingHours,
                averageUtilization,
                companiesNearLimit,
                companiesOverLimit,
            },
        }
    } catch (error) {
        console.error('Get company utilization report error:', error)
        return { success: false, error: 'Failed to fetch utilization report' }
    }
}

interface CreateCompanyInput {
    name: string
    allottedCreditHours: number
}

interface CreateCompanyResult {
    success: boolean
    data?: CompanyStats
    error?: string
}

export async function createCompany(input: CreateCompanyInput): Promise<CreateCompanyResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!input.name?.trim()) {
            return { success: false, error: 'Company name is required' }
        }

        if (input.allottedCreditHours < 0) {
            return { success: false, error: 'Allotted credit hours cannot be negative' }
        }

        // Check if company name already exists
        const existingCompany = await prisma.company.findFirst({
            where: { name: input.name.trim(), deletedAt: null },
        })

        if (existingCompany) {
            return { success: false, error: 'Company with this name already exists' }
        }

        const newCompany = await prisma.company.create({
            data: {
                name: input.name.trim(),
                allottedCreditHours: input.allottedCreditHours,
            },
        })

        // Invalidate cache
        await invalidateCompaniesCache()

        return {
            success: true,
            data: {
                id: newCompany.id,
                name: newCompany.name,
                allottedCreditHours: newCompany.allottedCreditHours,
                usedCreditHours: 0,
                remainingCreditHours: newCompany.allottedCreditHours,
                utilizationPercentage: 0,
                approvedBookingsCount: 0,
                pendingBookingsCount: 0,
                rejectedBookingsCount: 0,
                totalBookingsCount: 0,
                createdAt: newCompany.createdAt.toISOString(),
                updatedAt: newCompany.updatedAt.toISOString(),
            },
        }
    } catch (error) {
        console.error('Create company error:', error)
        return { success: false, error: 'Failed to create company' }
    }
}

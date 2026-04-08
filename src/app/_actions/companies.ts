'use server'

import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redist'
import { sendCompanyCreditAlertEmail } from './email/email-company'
import { headers } from 'next/headers'
import { createAuditChange, getRequestMetadata, persistAuditLog } from './audit-log-helpers'

type CompanyRepresentative = {
    id: string
    name: string
    email: string
}

export type CompanyStats = {
    id: string
    name: string
    allottedCreditHours: number
    usedCreditHours: number
    remainingCreditHours: number
    utilizationPercentage: number
    approvedBookingsCount: number
    totalBookingsCount: number
    createdAt: string
    updatedAt: string
    representative: CompanyRepresentative | null
}

export type RepresentativeCandidate = {
    id: string
    name: string
    email: string
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
        representative: CompanyRepresentative | null
    }
    error?: string
}

interface GetRepresentativeCandidatesResult {
    success: boolean
    data?: RepresentativeCandidate[]
    error?: string
}

interface DeleteCompanyResult {
    success: boolean
    error?: string
}

const COMPANIES_CACHE_KEY = 'companies:list:stats'
const COMPANY_DETAIL_CACHE_KEY_PREFIX = 'company:detail:'
const COMPANY_CREDIT_ALERT_CACHE_KEY_PREFIX = 'company:credit-alert:'
const CACHE_TTL_SECONDS = 60
const COMPANY_CREDIT_ALERT_THRESHOLD = 8
const COMPANY_CREDIT_ALERT_TTL_SECONDS = 10 * 60 // 6 hours to prevent alert fatigue, can be adjusted as needed
const EMAIL_DEBUG = process.env.EMAIL_DEBUG === 'true'

function getCompanyCreditAlertCacheKey(companyId: string): string {
    return `${COMPANY_CREDIT_ALERT_CACHE_KEY_PREFIX}${companyId}`
}

async function shouldSendLowCreditAlert(companyId: string, remainingHours: number): Promise<boolean> {
    if (!redis) {
        return true
    }
    
    const cacheKey = getCompanyCreditAlertCacheKey(companyId)
    const marker = remainingHours.toFixed(2)

    try {
        if (remainingHours > COMPANY_CREDIT_ALERT_THRESHOLD) {
            await redis.del(cacheKey)
            return false
        }

        const lastMarker = await redis.get<string>(cacheKey)
        if (lastMarker === marker) {
            if (EMAIL_DEBUG) {
                console.log('[company-credit-check] skipped: duplicate alert state', {
                    companyId,
                    remainingHours,
                })
            }
            return false
        }

        await redis.set(cacheKey, marker, { ex: COMPANY_CREDIT_ALERT_TTL_SECONDS })
        return true
    } catch (error) {
        console.error('Company credit alert cache error:', error)
        return true
    }
}

async function triggerLowCreditNotifications(companyIds: string[]): Promise<void> {
    const uniqueCompanyIds = Array.from(new Set(companyIds.filter((companyId) => companyId.trim())))
    if (!uniqueCompanyIds.length) {
        return
    }

    await Promise.allSettled(uniqueCompanyIds.map((companyId) => notifyRepresentativeIfCreditsLow(companyId)))
}

export async function notifyRepresentativeIfCreditsLow(companyId: string): Promise<void> {
    if (!companyId?.trim()) {
        if (EMAIL_DEBUG) {
            console.log('[company-credit-check] skipped: missing companyId')
        }
        return
    }

    try {
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                allottedCreditHours: true,
                usedCreditHours: true,
                representative: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        if (!company || !company.representative?.email) {
            if (EMAIL_DEBUG) {
                console.log('[company-credit-check] skipped: no company or representative email', {
                    companyId,
                    hasCompany: Boolean(company),
                    hasRepresentativeEmail: Boolean(company?.representative?.email),
                })
            }
            return
        }

        const remainingHours = company.allottedCreditHours - company.usedCreditHours
        if (EMAIL_DEBUG) {
            console.log('[company-credit-check] evaluated', {
                companyId: company.id,
                companyName: company.name,
                allottedCreditHours: company.allottedCreditHours,
                usedCreditHours: company.usedCreditHours,
                remainingHours,
                threshold: COMPANY_CREDIT_ALERT_THRESHOLD,
            })
        }

        if (remainingHours <= COMPANY_CREDIT_ALERT_THRESHOLD && await shouldSendLowCreditAlert(company.id, remainingHours)) {
            await sendCompanyCreditAlertEmail({
                to: company.representative.email,
                representativeName: company.representative.name,
                companyName: company.name,
                remainingHours,
                allottedHours: company.allottedCreditHours,
                usedHours: company.usedCreditHours,
            })
        } else if (EMAIL_DEBUG) {
            console.log('[company-credit-check] skipped: remaining hours above threshold', {
                companyId: company.id,
                remainingHours,
            })
        }
    } catch (error) {
        console.error('Notify representative low credits error:', error)
    }
}

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

export async function invalidateCompaniesStatsCache(companyId?: string | null): Promise<void> {
    await invalidateCompaniesCache()

    if (companyId?.trim()) {
        await invalidateCompanyDetailCache(companyId)
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
                    await triggerLowCreditNotifications(
                        cachedData
                            .filter((company) => company.remainingCreditHours <= COMPANY_CREDIT_ALERT_THRESHOLD)
                            .map((company) => company.id)
                    )
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
                representative: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
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
            const approvedBookings = company.bookings.filter((b) => b.approvalStatus === 'CONFIRMED')

            const totalCreditHoursUsed = company.usedCreditHours
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
                totalBookingsCount: company.bookings.length,
                createdAt: company.createdAt.toISOString(),
                updatedAt: company.updatedAt.toISOString(),
                representative: company.representative
                    ? {
                        id: company.representative.id,
                        name: company.representative.name,
                        email: company.representative.email,
                    }
                    : null,
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

        await triggerLowCreditNotifications(
            companiesStats
                .filter((company) => company.remainingCreditHours <= COMPANY_CREDIT_ALERT_THRESHOLD)
                .map((company) => company.id)
        )

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
                    if (cachedData.remainingCreditHours <= COMPANY_CREDIT_ALERT_THRESHOLD) {
                        await notifyRepresentativeIfCreditsLow(companyId)
                    }
                    return { success: true, data: cachedData }
                }
            } catch (error) {
                console.error('Cache read error:', error)
            }
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId, deletedAt: null },
            include: {
                representative: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
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

        const approvedBookings = company.bookings.filter((b) => b.approvalStatus === 'CONFIRMED')

        const totalCreditHoursUsed = company.usedCreditHours
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
            totalBookingsCount: company.bookings.length,
            createdAt: company.createdAt.toISOString(),
            updatedAt: company.updatedAt.toISOString(),
            representative: company.representative
                ? {
                    id: company.representative.id,
                    name: company.representative.name,
                    email: company.representative.email,
                }
                : null,
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

        if (result.remainingCreditHours <= COMPANY_CREDIT_ALERT_THRESHOLD) {
            await notifyRepresentativeIfCreditsLow(companyId)
        }

        return { success: true, data: result }
    } catch (error) {
        console.error('Get company details error:', error)
        return { success: false, error: 'Failed to fetch company details' }
    }
}

export async function getCompanyRepresentativeCandidates(companyId: string): Promise<GetRepresentativeCandidatesResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!companyId?.trim()) {
            return { success: false, error: 'Company ID is required' }
        }

        const users = await prisma.user.findMany({
            where: {
                deletedAt: null,
                companyId,
                role: { in: ['CLIENT', 'ADMIN'] },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: { name: 'asc' },
        })

        return {
            success: true,
            data: users,
        }
    } catch (error) {
        console.error('Get representative candidates error:', error)
        return { success: false, error: 'Failed to fetch representative candidates' }
    }
}

export async function getAvailableRepresentatives(): Promise<GetRepresentativeCandidatesResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        const users = await prisma.user.findMany({
            where: {
                deletedAt: null,
                role: { in: ['CLIENT', 'ADMIN'] },
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: { name: 'asc' },
            take: 200,
        })

        return {
            success: true,
            data: users,
        }
    } catch (error) {
        console.error('Get available representatives error:', error)
        return { success: false, error: 'Failed to fetch representatives' }
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
        await notifyRepresentativeIfCreditsLow(companyId)

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
    representativeUserId?: string
}

interface CreateCompanyResult {
    success: boolean
    data?: CompanyStats
    error?: string
}

interface UpdateCompanyInput {
    id: string
    name: string
    allottedCreditHours: number
    representativeUserId?: string
}

interface UpdateCompanyResult {
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

        if (!session.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const requestHeaders = await headers()

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

        const representativeUserId = input.representativeUserId?.trim() || null

        if (representativeUserId) {
            const candidate = await prisma.user.findFirst({
                where: {
                    id: representativeUserId,
                    deletedAt: null,
                    role: { in: ['CLIENT', 'ADMIN'] },
                },
                select: { id: true },
            })

            if (!candidate) {
                return { success: false, error: 'Representative must be an active CLIENT or ADMIN user' }
            }
        }

        const newCompany = await prisma.$transaction(async (tx) => {
            const created = await tx.company.create({
                data: {
                    name: input.name.trim(),
                    allottedCreditHours: input.allottedCreditHours,
                    representativeId: representativeUserId,
                },
                include: {
                    representative: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            })

            if (representativeUserId) {
                await tx.user.update({
                    where: { id: representativeUserId },
                    data: { companyId: created.id },
                })
            }

            return created
        })

        // Invalidate cache
        await invalidateCompaniesCache()
        await notifyRepresentativeIfCreditsLow(newCompany.id)

        const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)
        await persistAuditLog({
            action: 'CREATE',
            status: 'SUCCESS',
            module: 'Companies',
            entityType: 'Company',
            actorId: session.user.id,
            entityId: newCompany.id,
            targetLabel: newCompany.name,
            summary: `Created company ${newCompany.name}`,
            changes: [
                createAuditChange('name', null, newCompany.name),
                createAuditChange('allottedCreditHours', null, newCompany.allottedCreditHours),
                createAuditChange('representativeId', null, representativeUserId),
            ],
            ipAddress,
            userAgent,
            requestId,
        })

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
                totalBookingsCount: 0,
                createdAt: newCompany.createdAt.toISOString(),
                updatedAt: newCompany.updatedAt.toISOString(),
                representative: newCompany.representative
                    ? {
                        id: newCompany.representative.id,
                        name: newCompany.representative.name,
                        email: newCompany.representative.email,
                    }
                    : null,
            },
        }
    } catch (error) {
        console.error('Create company error:', error)
        return { success: false, error: 'Failed to create company' }
    }
}

export async function updateCompany(input: UpdateCompanyInput): Promise<UpdateCompanyResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!session.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const requestHeaders = await headers()

        if (!input.id?.trim()) {
            return { success: false, error: 'Company ID is required' }
        }

        if (!input.name?.trim()) {
            return { success: false, error: 'Company name is required' }
        }

        if (input.allottedCreditHours < 0) {
            return { success: false, error: 'Allotted credit hours cannot be negative' }
        }

        const currentCompany = await prisma.company.findFirst({
            where: {
                id: input.id,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                allottedCreditHours: true,
                representativeId: true,
            },
        })

        if (!currentCompany) {
            return { success: false, error: 'Company not found' }
        }

        const existingCompany = await prisma.company.findFirst({
            where: {
                name: input.name.trim(),
                deletedAt: null,
                NOT: { id: input.id },
            },
            select: { id: true },
        })

        if (existingCompany) {
            return { success: false, error: 'Company with this name already exists' }
        }

        let representativeId: string | null = null
        if (typeof input.representativeUserId === 'string' && input.representativeUserId.trim()) {
            const candidate = await prisma.user.findFirst({
                where: {
                    id: input.representativeUserId.trim(),
                    deletedAt: null,
                    companyId: input.id,
                    role: { in: ['CLIENT', 'ADMIN'] },
                },
                select: { id: true },
            })

            if (!candidate) {
                return { success: false, error: 'Representative must be an active user under this company' }
            }

            representativeId = candidate.id
        }

        const updatedCompany = await prisma.company.update({
            where: { id: input.id },
            data: {
                name: input.name.trim(),
                allottedCreditHours: input.allottedCreditHours,
                representativeId,
            },
            include: {
                representative: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                bookings: {
                    where: { deletedAt: null },
                    select: {
                        creditHoursUsed: true,
                        approvalStatus: true,
                    },
                },
            },
        })

        const approvedBookings = updatedCompany.bookings.filter((b) => b.approvalStatus === 'CONFIRMED')

        const totalCreditHoursUsed = updatedCompany.usedCreditHours
        const remainingCreditHours = updatedCompany.allottedCreditHours - totalCreditHoursUsed
        const utilizationPercentage = updatedCompany.allottedCreditHours > 0
            ? Math.round((totalCreditHoursUsed / updatedCompany.allottedCreditHours) * 100)
            : 0

        await invalidateCompaniesCache()
        await invalidateCompanyDetailCache(updatedCompany.id)
        await notifyRepresentativeIfCreditsLow(updatedCompany.id)

        const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)
        const changes = [
            createAuditChange('name', currentCompany.name, updatedCompany.name),
            createAuditChange('allottedCreditHours', currentCompany.allottedCreditHours, updatedCompany.allottedCreditHours),
            createAuditChange('representativeId', currentCompany.representativeId, representativeId),
        ].filter((change) => change.before !== change.after)

        if (changes.length > 0) {
            await persistAuditLog({
                action: 'EDIT',
                status: 'SUCCESS',
                module: 'Companies',
                entityType: 'Company',
                actorId: session.user.id,
                entityId: updatedCompany.id,
                targetLabel: updatedCompany.name,
                summary: `Updated company ${updatedCompany.name}`,
                changes,
                ipAddress,
                userAgent,
                requestId,
            })
        }

        return {
            success: true,
            data: {
                id: updatedCompany.id,
                name: updatedCompany.name,
                allottedCreditHours: updatedCompany.allottedCreditHours,
                usedCreditHours: totalCreditHoursUsed,
                remainingCreditHours,
                utilizationPercentage,
                approvedBookingsCount: approvedBookings.length,
                totalBookingsCount: updatedCompany.bookings.length,
                createdAt: updatedCompany.createdAt.toISOString(),
                updatedAt: updatedCompany.updatedAt.toISOString(),
                representative: updatedCompany.representative
                    ? {
                        id: updatedCompany.representative.id,
                        name: updatedCompany.representative.name,
                        email: updatedCompany.representative.email,
                    }
                    : null,
            },
        }
    } catch (error) {
        console.error('Update company error:', error)
        return { success: false, error: 'Failed to update company' }
    }
}

export async function deleteCompany(companyId: string): Promise<DeleteCompanyResult> {
    try {
        const session = await getServerSession()
        if (!session) {
            return { success: false, error: 'Unauthorized' }
        }

        if (!session.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const requestHeaders = await headers()

        if (!companyId?.trim()) {
            return { success: false, error: 'Company ID is required' }
        }

        const company = await prisma.company.findFirst({
            where: { id: companyId, deletedAt: null },
            select: { id: true, name: true, representativeId: true, deletedAt: true },
        })

        if (!company) {
            return { success: false, error: 'Company not found' }
        }

        const activeBookingsCount = await prisma.booking.count({
            where: {
                companyId,
                deletedAt: null,
                isActive: true,
            },
        })

        if (activeBookingsCount > 0) {
            return {
                success: false,
                error: 'Cannot delete company while it has active bookings',
            }
        }

        const deletedAt = new Date()

        await prisma.$transaction(async (tx) => {
            await tx.company.update({
                where: { id: companyId },
                data: {
                    representativeId: null,
                    deletedAt,
                },
            })

            await tx.user.updateMany({
                where: { companyId },
                data: { companyId: null },
            })
        })

        await invalidateCompaniesCache()
        await invalidateCompanyDetailCache(companyId)

        const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)

        await persistAuditLog({
            action: 'DELETE',
            status: 'SUCCESS',
            module: 'Companies',
            entityType: 'Company',
            actorId: session.user.id,
            entityId: companyId,
            targetLabel: company.name,
            summary: `Soft deleted company ${company.name}`,
            changes: [
                createAuditChange('representativeId', company.representativeId, null),
                createAuditChange('deletedAt', company.deletedAt, deletedAt),
            ],
            ipAddress,
            userAgent,
            requestId,
        })

        return { success: true }
    } catch (error) {
        console.error('Delete company error:', error)
        return { success: false, error: 'Failed to delete company' }
    }
}

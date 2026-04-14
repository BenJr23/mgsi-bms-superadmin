"use server"

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
    persistAuditLog,
    normalizeAuditValue,
    getRequestMetadata,
    type AuditLogPayload,
    type AuditActionType,
    type AuditLogChange,
    type AuditStatusType,
} from './audit-log-helpers'

export interface GetAuditLogsInput {
    page?: number
    pageSize?: number
    searchQuery?: string
    action?: AuditActionType | 'ALL'
    status?: AuditStatusType | 'ALL'
    module?: string
}

interface AuditLogListItem {
    id: string
    logNumber: string
    actorName: string
    actorEmail: string
    action: AuditActionType
    module: string
    target: string
    status: AuditStatusType
    timestamp: string
    changes: AuditLogChange[]
}

export interface GetAuditLogsResult {
    success: boolean
    error?: string
    data?: {
        logs: AuditLogListItem[]
        moduleOptions: string[]
        pagination: {
            page: number
            pageSize: number
            totalItems: number
            totalPages: number
        }
    }
}

function parseChanges(raw: unknown): AuditLogChange[] {
    if (!Array.isArray(raw)) return []

    return raw
        .map((item) => {
            if (!item || typeof item !== 'object') return null

            const record = item as Record<string, unknown>
            const field = typeof record.field === 'string' ? record.field : null
            if (!field) return null

            return {
                field,
                before: normalizeAuditValue(record.before),
                after: normalizeAuditValue(record.after),
            }
        })
        .filter((item): item is AuditLogChange => item !== null)
}

export async function createAuditLog(payload: AuditLogPayload): Promise<void> {
    await persistAuditLog(payload)
}

export async function logUnauthorizedAccessAttempt(input: {
    actorId: string
    role?: string | null
    route?: string
    module?: string
    reason?: string
}): Promise<void> {
    try {
        const requestHeaders = await headers()
        const { ipAddress, userAgent, requestId } = getRequestMetadata(requestHeaders)
        const deniedRoute = input.route || '/(auth)'

        await persistAuditLog({
            action: 'EDIT',
            status: 'FAILED',
            module: input.module || 'Authentication',
            entityType: 'RouteAccess',
            actorId: input.actorId,
            entityId: deniedRoute,
            targetLabel: deniedRoute,
            summary: input.reason || `Unauthorized access attempt to ${deniedRoute}`,
            changes: [
                {
                    field: 'role',
                    before: normalizeAuditValue(input.role),
                    after: 'ADMIN|SUPERADMIN required',
                },
                {
                    field: 'result',
                    before: 'access requested',
                    after: 'redirected to sign-in',
                },
            ],
            ipAddress,
            userAgent,
            requestId,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error logging unauthorized access'
        console.error('Error logging unauthorized access attempt:', message)
    }
}

export async function getAuditLogs(input: GetAuditLogsInput = {}): Promise<GetAuditLogsResult> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session?.user || !session.user.id) {
            return { success: false, error: 'Unauthorized: No session' }
        }

        if (session.user.role !== 'SUPERADMIN') {
            return { success: false, error: 'Unauthorized: Only SUPERADMIN can view audit logs' }
        }

        const page = Math.max(1, input.page ?? 1)
        const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 10))
        const searchQuery = input.searchQuery?.trim()
        const actionFilter = input.action && input.action !== 'ALL' ? input.action : undefined
        const statusFilter = input.status && input.status !== 'ALL' ? input.status : undefined
        const moduleFilter = input.module && input.module !== 'ALL' ? input.module : undefined

        const whereClause = {
            ...(actionFilter ? { action: actionFilter } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(moduleFilter ? { module: moduleFilter } : {}),
            ...(searchQuery
                ? {
                    OR: [
                        { logNumber: { contains: searchQuery, mode: 'insensitive' as const } },
                        { module: { contains: searchQuery, mode: 'insensitive' as const } },
                        { targetLabel: { contains: searchQuery, mode: 'insensitive' as const } },
                        { summary: { contains: searchQuery, mode: 'insensitive' as const } },
                        { entityId: { contains: searchQuery, mode: 'insensitive' as const } },
                        { actor: { is: { name: { contains: searchQuery, mode: 'insensitive' as const } } } },
                        { actor: { is: { email: { contains: searchQuery, mode: 'insensitive' as const } } } },
                    ],
                }
                : {}),
        }

        const offset = (page - 1) * pageSize

        const [totalItems, logs, modules] = await Promise.all([
            prisma.auditLog.count({
                where: whereClause,
            }),
            prisma.auditLog.findMany({
                where: whereClause,
                orderBy: {
                    occurredAt: 'desc',
                },
                skip: offset,
                take: pageSize,
                include: {
                    actor: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.auditLog.findMany({
                distinct: ['module'],
                select: {
                    module: true,
                },
                orderBy: {
                    module: 'asc',
                },
            }),
        ])

        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

        return {
            success: true,
            data: {
                logs: logs.map((log) => ({
                    id: log.id,
                    logNumber: log.logNumber,
                    actorName: log.actor.name,
                    actorEmail: log.actor.email,
                    action: log.action as AuditActionType,
                    module: log.module,
                    target: log.targetLabel || log.entityId || '-',
                    status: log.status as AuditStatusType,
                    timestamp: log.occurredAt.toISOString(),
                    changes: parseChanges(log.changes),
                })),
                moduleOptions: modules.map((moduleItem) => moduleItem.module),
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
        console.error('Error fetching audit logs:', message)
        return { success: false, error: message }
    }
}

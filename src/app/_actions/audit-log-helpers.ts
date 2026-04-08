export type AuditActionType = 'CREATE' | 'EDIT' | 'DELETE'
export type AuditStatusType = 'SUCCESS' | 'FAILED'

export interface AuditLogChange {
    field: string
    before: string | null
    after: string | null
}

export interface AuditLogPayload {
    action: AuditActionType
    status: AuditStatusType
    module: string
    entityType: string
    actorId: string
    entityId: string
    targetLabel?: string
    summary: string
    changes?: AuditLogChange[]
    ipAddress?: string | null
    userAgent?: string | null
    requestId?: string | null
}

import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export function normalizeAuditValue(value: unknown): string | null {
    if (value === null || value === undefined) return null
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }

    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}

export function createAuditChange(field: string, before: unknown, after: unknown): AuditLogChange {
    return {
        field,
        before: normalizeAuditValue(before),
        after: normalizeAuditValue(after),
    }
}

export function getRequestMetadata(requestHeaders: Headers): {
    ipAddress: string | null
    userAgent: string | null
    requestId: string | null
} {
    const forwardedFor = requestHeaders.get('x-forwarded-for')
    const realIp = requestHeaders.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null
    const userAgent = requestHeaders.get('user-agent')
    const requestId = requestHeaders.get('x-request-id') || requestHeaders.get('x-correlation-id')

    return {
        ipAddress,
        userAgent,
        requestId,
    }
}

function generateAuditLogNumber(action: AuditActionType, status: AuditStatusType, date: Date): string {
    const actionCode = action === 'CREATE' ? 'C' : action === 'EDIT' ? 'E' : 'D'
    const statusCode = status === 'SUCCESS' ? 'S' : 'F'
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')

    return `L${actionCode}${statusCode}${year}${month}${day}-${hour}${minute}${second}`
}

export async function persistAuditLog(payload: AuditLogPayload): Promise<void> {
    const occurredAt = new Date()

    try {
        await prisma.auditLog.create({
            data: {
                logNumber: generateAuditLogNumber(payload.action, payload.status, occurredAt),
                action: payload.action,
                status: payload.status,
                module: payload.module,
                entityType: payload.entityType,
                entityId: payload.entityId,
                targetLabel: payload.targetLabel || null,
                actorId: payload.actorId,
                changes: payload.changes
                    ? (payload.changes as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                summary: payload.summary,
                ipAddress: payload.ipAddress || null,
                userAgent: payload.userAgent || null,
                requestId: payload.requestId || null,
                occurredAt,
            },
        })
    } catch (error) {
        console.error('Error creating audit log:', error)
    }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function isAuthorized(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
        return false
    }

    const url = new URL(request.url)
    const tokenFromQuery = url.searchParams.get('token')
    const tokenFromHeader = request.headers.get('x-cron-secret')
    const authorization = request.headers.get('authorization')
    const bearerToken = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null

    return [tokenFromQuery, tokenFromHeader, bearerToken].some((value) => value === cronSecret)
}

export async function GET(request: Request): Promise<Response> {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startOfCurrentMonth = new Date()
    startOfCurrentMonth.setDate(1)
    startOfCurrentMonth.setHours(0, 0, 0, 0)

    const result = await prisma.company.updateMany({
        where: {
            deletedAt: null,
            updatedAt: {
                lt: startOfCurrentMonth,
            },
            usedCreditHours: {
                not: 0,
            },
        },
        data: {
            usedCreditHours: 0,
        },
    })

    return NextResponse.json({
        success: true,
        resetCount: result.count,
        executedAt: new Date().toISOString(),
    })
}
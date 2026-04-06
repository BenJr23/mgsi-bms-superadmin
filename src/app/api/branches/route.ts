import { NextResponse } from 'next/server'

import prisma from '@/lib/prisma'

type ExternalRoom = {
    id: string
    roomName: string
    roomCode: string | null
    capacity: number
    status: string
    buildingId: string
}

type ExternalBranch = {
    id: string
    buildingName: string
    buildingCode: string
    address: string | null
    status: string
    rooms: ExternalRoom[]
}

function isAuthorized(request: Request): boolean {
    const secret = process.env.BMS_SECRET_KEY

    if (!secret) {
        return false
    }

    const authorization = request.headers.get('authorization')
    const bearerToken = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null
    const headerToken = request.headers.get('x-bms-secret-key')

    return bearerToken === secret || headerToken === secret
}

export async function GET(request: Request): Promise<Response> {
    if (!process.env.BMS_SECRET_KEY) {
        return NextResponse.json(
            { success: false, error: 'BMS_SECRET_KEY is not configured' },
            { status: 500 }
        )
    }

    if (!isAuthorized(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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
            status: true,
            rooms: {
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                    roomName: true,
                    roomCode: true,
                    capacity: true,
                    status: true,
                    buildingId: true,
                },
                orderBy: {
                    roomName: 'asc',
                },
            },
        },
        orderBy: {
            buildingName: 'asc',
        },
    })

    const branches: ExternalBranch[] = buildings.map((building) => ({
        ...building,
        status: building.status,
        rooms: building.rooms.map((room) => ({
            ...room,
            status: room.status,
        })),
    }))

    const rooms: ExternalRoom[] = branches.flatMap((branch) => branch.rooms)

    const response = NextResponse.json({
        success: true,
        data: {
            branches,
            rooms,
        },
    })

    response.headers.set('Cache-Control', 'no-store')

    return response
}
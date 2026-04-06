import { randomUUID } from 'crypto'

import { signJWT, verifyPassword } from 'better-auth/crypto'
import { NextResponse } from 'next/server'

import prisma from '@/lib/prisma'

type IntegratedLoginBody = {
  email?: unknown
  password?: unknown
}

type IntegratedLoginUser = {
  id: string
  email: string
  name: string
    phoneNumber: string | null
  role: string
  companyId: string | null
  passwordVerified: boolean
}

const TOKEN_TTL_SECONDS = Number(process.env.INTEGRATED_LOGIN_TOKEN_TTL_SECONDS ?? 300)
const TOKEN_ISSUER = process.env.INTEGRATED_LOGIN_ISSUER ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
const TOKEN_AUDIENCE = process.env.INTEGRATED_LOGIN_AUDIENCE ?? 'other-system'
const TOKEN_SECRET = process.env.BMS_SECRET_KEY

function getRequestBodyEmailAndPassword(body: IntegratedLoginBody): { email: string; password: string } | null {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
        return null
    }

    return { email, password }
}

function buildUnauthorizedResponse(): NextResponse {
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
}

export async function POST(request: Request): Promise<Response> {
    if (!TOKEN_SECRET) {
        return NextResponse.json(
            { success: false, error: 'BMS_SECRET_KEY is not configured' },
            { status: 500 }
        )
    }

    let body: IntegratedLoginBody

    try {
        body = (await request.json()) as IntegratedLoginBody
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
    }

    const credentials = getRequestBodyEmailAndPassword(body)

    if (!credentials) {
        return NextResponse.json(
            { success: false, error: 'Email and password are required' },
            { status: 400 }
        )
    }

    const user = await prisma.user.findFirst({
        where: {
            email: credentials.email,
            deletedAt: null,
        },
        select: {
            id: true,
            email: true,
            name: true,
            phoneNumber: true,
            role: true,
            companyId: true,
            passwordVerified: true,
            accounts: {
                where: {
                    providerId: 'credential',
                    deletedAt: null,
                },
                select: {
                    password: true,
                },
                take: 1,
            },
        },
    })

    const credentialAccount = user?.accounts[0]

    if (!user || !credentialAccount?.password) {
        return buildUnauthorizedResponse()
    }

    let passwordMatches = false

    try {
        passwordMatches = await verifyPassword({
            hash: credentialAccount.password,
            password: credentials.password,
        })
    } catch {
        return buildUnauthorizedResponse()
    }

    if (!passwordMatches) {
        return buildUnauthorizedResponse()
    }

    const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000)
    const exchangeToken = await signJWT(
        {
            typ: 'integrated-login',
            jti: randomUUID(),
            iss: TOKEN_ISSUER,
            aud: TOKEN_AUDIENCE,
            sub: user.id,
            email: user.email,
            name: user.name,
            phoneNumber: user.phoneNumber,
            role: user.role,
            companyId: user.companyId,
            passwordVerified: user.passwordVerified,
        },
        TOKEN_SECRET,
        TOKEN_TTL_SECONDS
    )

    const responseUser: IntegratedLoginUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        companyId: user.companyId,
        passwordVerified: user.passwordVerified,
    }

    const response = NextResponse.json({
        success: true,
        token: exchangeToken,
        tokenType: 'Bearer',
        expiresAt: tokenExpiresAt.toISOString(),
        audience: TOKEN_AUDIENCE,
        issuer: TOKEN_ISSUER,
        user: responseUser,
    })

    response.headers.set('Cache-Control', 'no-store')

    return response
}
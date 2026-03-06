import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { NextResponse } from 'next/server'

const handler = toNextJsHandler(auth)

function isBrowserNavigation(request: Request): boolean {
    const mode = request.headers.get('sec-fetch-mode')
    const dest = request.headers.get('sec-fetch-dest')
    return mode === 'navigate' || dest === 'document'
}

export async function GET(request: Request): Promise<Response> {
    if (isBrowserNavigation(request)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return handler.GET(request)
}

export const POST = handler.POST
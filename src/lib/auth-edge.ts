import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js';

/**
 * Edge-compatible auth client for middleware
 * This version doesn't include the Prisma adapter to work in Edge Runtime
 * Session verification works using JWT tokens only
 */
export const authEdge = betterAuth({
    // Don't include database adapter for edge runtime
    // Session verification will work using JWT tokens only
    
    user: {
        additionalFields: {
            role: { type: "string" },
            companyName: { type: "string" },
            phoneNumber: { type: "string" },
            passwordVerified: { type: "boolean" },
        }
    },
    
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days (must match main auth config)
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },
    
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || [
        'http://localhost:3001',
        'http://localhost:3002'
    ],
    
    advanced: {
        generateId: false,
        useSecureCookies: process.env.NODE_ENV === 'production',
        crossSubDomainCookies: {
            enabled: false,
        },
    },
    
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    plugins: [nextCookies()],
});

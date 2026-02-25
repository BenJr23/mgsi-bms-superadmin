import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from '@/lib/prisma'
import { nextCookies } from 'better-auth/next-js';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    user: {
        additionalFields: {
            role: { type: "string" },
            companyName: { type: "string" },
            phoneNumber: { type: "string" },
            passwordVerified: { type: "boolean" },
        }
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    //session: {
       // expiresIn: 60 * 60 * 24 * 7,
        //updateAge: 60 * 60 * 24,
        //cookieCache: {
          //  enabled: false,
       //     maxAge: 5 * 60,
    //    },
  //  },
    // Ensure baseURL matches your environment
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret: process.env.BETTER_AUTH_SECRET,
    plugins: [nextCookies()],
    trustedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
});
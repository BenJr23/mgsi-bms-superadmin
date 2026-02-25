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
        // ADD THIS BLOCK BELOW:
        async sendResetPassword({ user, url }) {
            // In development, this logs the URL with the token to your terminal
            console.log(">>> RESET PASSWORD URL:", url);

            // In production, you would use Resend, Nodemailer, etc.
            // await sendEmail({ to: user.email, url });
        },
    },
    rateLimit: {
        enabled: true,
        window: 60, // 1 minute
        max: 100, // 100 requests per minute
    },
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002'
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    plugins: [nextCookies()],
})
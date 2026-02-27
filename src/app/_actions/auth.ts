"use server";

import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getSession, requireAuth } from '@/lib/get-session';
import { hashPassword } from 'better-auth/crypto';

export async function forgotPassword(email: string) {
    try {
        if (!email) {
            return { error: "Email is required", success: false };
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return { error: "User not found", success: false };
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to database (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Delete any existing OTP for this email
        await prisma.verification.deleteMany({
            where: {
                identifier: email,
            }
        });

        // Create new OTP verification record
        await prisma.verification.create({
            data: {
                identifier: email,
                value: otp,
                expiresAt,
            }
        });

        // Setup Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.USER,
                pass: process.env.PASSWORD,
            },
        });

        // Send the Email
        await transporter.sendMail({
            from: `"GreatWork" <${process.env.USER}>`,
            to: email,
            subject: "Your Password Reset OTP",
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2>Password Reset</h2>
                  <p>Your OTP is: <strong>${otp}</strong></p>
                  <p>This code expires in 10 minutes.</p>
                </div>
            `,
        });

        console.log(`✅ Email sent to ${email}. OTP: ${otp}`);

        return { message: "OTP sent successfully", success: true };
    } catch (error: any) {
        console.error("❌ FORGOT PASSWORD ERROR:", error.message);
        return { error: "Failed to send email. Check server logs.", success: false };
    }
}

export async function verifyOTP(email: string, otp: string) {
    try {
        if (!email || !otp) {
            return { error: "Email and OTP are required", success: false };
        }

        // Find the verification record
        const verification = await prisma.verification.findFirst({
            where: {
                identifier: email,
                value: otp,
            }
        });

        if (!verification) {
            return { error: "Invalid OTP", success: false };
        }

        // Check if OTP is expired
        if (new Date() > verification.expiresAt) {
            // Delete expired OTP
            await prisma.verification.delete({
                where: { id: verification.id }
            });
            return { error: "OTP has expired", success: false };
        }

        console.log(`✅ OTP verified for ${email}`);

        return { message: "OTP verified successfully", verified: true, success: true };
    } catch (error: any) {
        console.error("❌ VERIFY OTP ERROR:", error.message);
        return { error: "Failed to verify OTP. Check server logs.", success: false };
    }
}

export async function resetPasswordWithOTP(email: string, otp: string, newPassword: string) {
    try {
        if (!email || !otp || !newPassword) {
            return { error: "Email, OTP, and new password are required", success: false };
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return { error: "Password must be at least 8 characters long", success: false };
        }

        // Verify OTP one more time
        const verification = await prisma.verification.findFirst({
            where: {
                identifier: email,
                value: otp,
            }
        });

        if (!verification) {
            return { error: "Invalid OTP", success: false };
        }

        // Check if OTP is expired
        if (new Date() > verification.expiresAt) {
            await prisma.verification.delete({
                where: { id: verification.id }
            });
            return { error: "OTP has expired", success: false };
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { accounts: true }
        });

        if (!user) {
            return { error: "User not found", success: false };
        }

        // Hash the new password using better-auth's crypto
        const hashedPassword = await hashPassword(newPassword);

        // Update the password in the account table
        const credentialAccount = user.accounts.find((acc: { providerId: string; }) => acc.providerId === "credential");

        if (credentialAccount) {
            await prisma.account.update({
                where: { id: credentialAccount.id },
                data: { password: hashedPassword }
            });
        } else {
            // Create credential account if doesn't exist
            await prisma.account.create({
                data: {
                    userId: user.id,
                    accountId: user.id,
                    providerId: "credential",
                    password: hashedPassword,
                }
            });
        }

        // Delete the used OTP
        await prisma.verification.delete({
            where: { id: verification.id }
        });

        console.log(`✅ Password reset successful for ${email}`);

        return { message: "Password reset successfully", success: true };
    } catch (error: any) {
        console.error("❌ RESET PASSWORD ERROR:", error.message);
        return { error: "Failed to reset password. Check server logs.", success: false };
    }
}

export async function getCurrentUser() {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return { error: "Not authenticated", success: false };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                passwordVerified: true,
            },
        });

        if (!user) {
            return { error: "User not found", success: false };
        }

        return { user, success: true };
    } catch (err) {
        console.error(err);
        return { error: "Server error", success: false };
    }
}

export async function getLastLogin() {
    try {
        const user = await requireAuth();

        const latestSession = await prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            select: {
                createdAt: true,
            }
        });

        return {
            lastLogin: latestSession?.createdAt ?? null,
            success: true
        };
    } catch (err) {
        console.error("Failed to fetch last login:", err);
        return {
            lastLogin: null,
            success: false,
            error: err instanceof Error ? err.message : "Server error"
        };
    }
}

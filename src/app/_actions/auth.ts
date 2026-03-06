"use server";

import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getSession, requireAuth } from '@/lib/get-session';
import { hashPassword } from 'better-auth/crypto';
import { redis } from '@/lib/redist';

const PROFILE_CACHE_TTL_SECONDS = 120;

function getProfileCacheKey(userId: string): string {
    return `profile:page:${userId}`;
}

async function invalidateProfileCache(userId: string): Promise<void> {
    if (!redis) {
        return;
    }

    try {
        await redis.del(getProfileCacheKey(userId));
    } catch (error) {
        console.error('Profile cache invalidation error:', error);
    }
}

export async function getCurrentUserForExport() {
    const session = await getSession();

    if (!session?.user?.id) {
        return { success: false as const, error: 'Not authenticated.' };
    }

    return {
        success: true as const,
        data: {
            id: session.user.id,
            name: (session.user as { name?: string | null }).name ?? null,
            email: session.user.email,
        },
    };
}

export async function getCurrentSessionAction() {
    const session = await getSession();

    if (!session?.user?.id) {
        return { success: false as const, error: 'Not authenticated.' };
    }

    return {
        success: true as const,
        data: {
            id: session.user.id,
            email: session.user.email,
            name: (session.user as { name?: string | null }).name ?? null,
            role: (session.user as { role?: string | null }).role ?? null,
            companyName: (session.user as { companyName?: string | null }).companyName ?? null,
            image: (session.user as { image?: string | null }).image ?? null,
        },
    };
}

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
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

// Send the Email
        await transporter.sendMail({
            from: `"GreatWork" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Your GreatWork Verification Code",
            html: `
                <div style="background-color: #ffffff; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
                    <div style="max-width: 460px; margin: 0 auto; text-align: center;">
                        
                        <img src="https://static.wixstatic.com/media/0f0d2b_a16c66e8204b4a4a9aa7d1c5eb937db7~mv2.png" 
                             alt="GreatWork" 
                             style="width: 140px; margin-bottom: 40px;" />

                        <h1 style="font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 8px;">
                            Reset your password
                        </h1>
                        <p style="color: #666666; font-size: 16px; margin-bottom: 32px;">
                            Enter the following code to verify your identity.
                        </p>
                        
                        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; border: 1px solid #eaeaea; margin-bottom: 32px;">
                            <span style="font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2d333a;">
                                ${otp}
                            </span>
                        </div>

                        <p style="font-size: 14px; color: #888888;">
                            This code expires in <span style="color: #1a1a1a; font-weight: 600;">10 minutes</span>.
                        </p>
                        
                        <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />
                        
                        <p style="font-size: 12px; color: #b0b0b0; text-transform: uppercase; letter-spacing: 1px;">
                            © ${new Date().getFullYear()} GreatWork Team
                        </p>
                    </div>
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

export async function verifyPasswordResetOTP(email: string, otp: string) {
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
            return { error: "Incorrect or expired OTP", success: false };
        }

        // Check if OTP is expired
        if (new Date() > verification.expiresAt) {
            // Delete expired OTP
            await prisma.verification.delete({
                where: { id: verification.id }
            });
            return { error: "OTP has expired", success: false };
        }

        // Generate a reset token
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Store the reset token in the database (expires in 15 minutes)
        const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        await prisma.verification.create({
            data: {
                identifier: `reset_token:${resetToken}`,
                value: email,
                expiresAt: tokenExpiresAt,
            }
        });

        // Delete the used OTP
        await prisma.verification.delete({
            where: { id: verification.id }
        });

        console.log(`✅ OTP verified for ${email}, reset token generated`);

        return { token: resetToken, success: true };
    } catch (error: any) {
        console.error("❌ VERIFY PASSWORD RESET OTP ERROR:", error.message);
        return { error: "Failed to verify OTP. Check server logs.", success: false };
    }
}

export async function resetPasswordWithToken(token: string, password: string) {
    try {
        if (!token || !password) {
            return { error: "Token and password are required", success: false };
        }

        // Validate password strength
        if (password.length < 8) {
            return { error: "Password must be at least 8 characters long", success: false };
        }

        // Find the reset token
        const tokenRecord = await prisma.verification.findFirst({
            where: {
                identifier: `reset_token:${token}`,
            }
        });

        if (!tokenRecord) {
            return { error: "Invalid or expired reset token", success: false };
        }

        // Check if token is expired
        if (new Date() > tokenRecord.expiresAt) {
            // Delete expired token
            await prisma.verification.delete({
                where: { id: tokenRecord.id }
            });
            return { error: "Reset token has expired", success: false };
        }

        const email = tokenRecord.value;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { accounts: true }
        });

        if (!user) {
            return { error: "User not found", success: false };
        }

        // Hash the new password using better-auth's crypto
        const hashedPassword = await hashPassword(password);

        // Update the password in the account table
        const credentialAccount = user.accounts.find((acc: { providerId: string; }) => acc.providerId === "credential");

        if (credentialAccount) {
            await prisma.account.update({
                where: { id: credentialAccount.id },
                data: { password: hashedPassword }
            });
        } else {
            return { error: "No credential account found for this user", success: false };
        }

        // Update passwordVerified flag
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordVerified: true }
        });

        // Delete the used token
        await prisma.verification.delete({
            where: { id: tokenRecord.id }
        });

        console.log(`✅ Password reset successful for ${email}`);

        return { message: "Password reset successfully", success: true };
    } catch (error: any) {
        console.error("❌ RESET PASSWORD WITH TOKEN ERROR:", error.message);
        return { error: "Failed to reset password. Check server logs.", success: false };
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
                companyName: true,
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

export async function getProfilePageDataCached() {
    try {
        const user = await requireAuth();
        const cacheKey = getProfileCacheKey(user.id);

        if (redis) {
            try {
                const cached = await redis.get<{
                    id: string;
                    name: string;
                    email: string;
                    role: 'ADMIN' | 'SUPERADMIN';
                    image: string | null;
                    phoneNumber: string;
                    companyName: string;
                    createdAt: string | null;
                    lastLogin: string | null;
                }>(cacheKey);

                if (cached) {
                    return { success: true, data: cached };
                }
            } catch (error) {
                console.error('Profile cache read error:', error);
            }
        }

        const [profile, latestSession] = await Promise.all([
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    image: true,
                    phoneNumber: true,
                    companyName: true,
                    createdAt: true,
                },
            }),
            prisma.session.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
        ]);

        if (!profile) {
            return { success: false, error: 'User not found' };
        }

        const data = {
            id: profile.id,
            name: profile.name ?? '',
            email: profile.email,
            role: profile.role === 'SUPERADMIN' ? 'SUPERADMIN' as const : 'ADMIN' as const,
            image: profile.image,
            phoneNumber: profile.phoneNumber ?? '',
            companyName: profile.companyName ?? '',
            createdAt: profile.createdAt?.toISOString() ?? null,
            lastLogin: latestSession?.createdAt?.toISOString() ?? null,
        };

        if (redis) {
            try {
                await redis.set(cacheKey, data, { ex: PROFILE_CACHE_TTL_SECONDS });
            } catch (error) {
                console.error('Profile cache write error:', error);
            }
        }

        return { success: true, data };
    } catch (err) {
        console.error('Failed to fetch cached profile data:', err);
        return { error: err instanceof Error ? err.message : 'Server error', success: false };
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

export async function updateUserProfile(data: { name: string; phoneNumber: string; companyName?: string }) {
    try {
        const user = await requireAuth();

        // Validate input
        if (!data.name || data.name.trim().length === 0) {
            return { error: "Name is required", success: false };
        }

        if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
            return { error: "Phone number is required", success: false };
        }

        // Update user in database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name: data.name.trim(),
                phoneNumber: data.phoneNumber.trim(),
                ...(data.companyName !== undefined && { companyName: data.companyName.trim() || null }),
            },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                companyName: true,
                email: true,
            },
        });

        await invalidateProfileCache(user.id);

        return { success: true, user: updatedUser };
    } catch (err) {
        console.error("Profile update error:", err);
        return { error: err instanceof Error ? err.message : "Server error", success: false };
    }
}

export async function verifyPasswordUpdate() {
    try {
        const user = await requireAuth();

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordVerified: true },
        });

        return { success: true };
    } catch (err) {
        console.error("Password verification error:", err);
        return { error: err instanceof Error ? err.message : "Server error", success: false };
    }
}

export async function uploadProfilePicture(formData: FormData) {
    try {
        const user = await requireAuth();
        
        const file = formData.get('file') as File;

        if (!file) {
            return { error: 'No file provided', success: false };
        }

        // Validate file
        if (!file.type.startsWith('image/')) {
            return { error: 'Invalid file type', success: false };
        }

        if (file.size > 5 * 1024 * 1024) {
            return { error: 'File too large', success: false };
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return { error: 'Supabase configuration missing', success: false };
        }

        // Initialize Supabase client with service role key (for server-side operations)
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get current user image to delete old one
        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { image: true }
        });

        // Delete old image if exists
        if (currentUser?.image) {
            try {
                // Extract the path from the full URL
                const pathMatch = currentUser.image.match(/BMS\/.+/);
                if (pathMatch) {
                    const { error: deleteError } = await supabase.storage
                        .from('BMS')
                        .remove([pathMatch[0]]);

                    if (deleteError) {
                        console.warn('Failed to delete old image:', deleteError);
                    }
                }
            } catch (err) {
                console.warn('Error deleting old image:', err);
            }
        }

        // Upload new image
        const fileExt = file.type.split('/')[1];
        const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;

        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        const { error: uploadError } = await supabase.storage
            .from('BMS')
            .upload(fileName, uint8Array, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return { error: 'Failed to upload image', success: false };
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('BMS')
            .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        // Update user image in database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { image: imageUrl },
            select: {
                id: true,
                image: true,
                name: true,
                email: true,
            }
        });

        await invalidateProfileCache(user.id);

        return {
            success: true,
            image: updatedUser.image,
            user: updatedUser
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        console.error('Profile picture upload error:', err);
        return { error: message, success: false };
    }
}
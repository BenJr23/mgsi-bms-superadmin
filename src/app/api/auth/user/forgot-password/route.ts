import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import prisma from "@/lib/prisma";
import { hashPassword } from 'better-auth/crypto';

declare global {
  var otpStore: Map<string, { otp: string, expires: number }> | undefined;
  var verifiedSessions: Map<string, { email: string, expires: number }> | undefined;
}

const otpCache = global.otpStore || new Map<string, { otp: string, expires: number }>();
const sessionCache = global.verifiedSessions || new Map<string, { email: string, expires: number }>();

if (process.env.NODE_ENV !== 'production') {
  global.otpStore = otpCache;
  global.verifiedSessions = sessionCache;
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error("JSON PARSE ERROR:", parseError.message);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { action, email: rawEmail, otp, password, token } = body;
    const email = rawEmail?.toLowerCase().trim();

    // --- 1. RESET PASSWORD LOGIC ---
    if (action === 'reset') {
      if (!token) {
        return NextResponse.json({ error: "Reset token required" }, { status: 400 });
      }

      const session = sessionCache.get(token);

      if (!session || Date.now() > session.expires) {
        return NextResponse.json({ error: "Session expired." }, { status: 400 });
      }

      if (!password) {
        return NextResponse.json({ error: "Password required" }, { status: 400 });
      }

      try {
        // Look up user by email
        const user = await prisma.user.findUnique({
          where: { email: session.email },
          select: { id: true },
        });

        if (!user) {
          return NextResponse.json({ error: "User not found." }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        // Update account by userId (more reliable than accountId)
        const updateAccount = await prisma.account.updateMany({
          where: { 
            userId: user.id,
            providerId: 'credential',
          },
          data: { password: hashedPassword },
        });

        if (updateAccount.count === 0) {
          return NextResponse.json({ error: "No credential account found for this user." }, { status: 400 });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { passwordVerified: true },
        });

        sessionCache.delete(token);
        return NextResponse.json({ success: true, message: "Password updated successfully" });

      } catch (dbError: any) {
        console.error("DB ERROR:", dbError.message);
        return NextResponse.json({ error: "Database update failed." }, { status: 500 });
      }
    }

    // --- 2. VERIFY OTP LOGIC ---
    if (action === 'verify') {
      if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
      }

      if (!otp) {
        return NextResponse.json({ error: "OTP required" }, { status: 400 });
      }

      const storedData = otpCache.get(email);
      if (!storedData || storedData.otp !== otp) {
        return NextResponse.json({ error: "Incorrect or expired OTP." }, { status: 400 });
      }

      const resetToken = Math.random().toString(36).substring(2, 15);
      sessionCache.set(resetToken, { email, expires: Date.now() + 15 * 60 * 1000 });
      otpCache.delete(email);

      return NextResponse.json({ success: true, token: resetToken });
    }

    // --- 3. SEND OTP LOGIC ---
    if (action === 'send') {
      if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
      }

      try {
        // Verify user exists before sending OTP
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (!user) {
          return NextResponse.json({ error: "No account found with this email." }, { status: 400 });
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        otpCache.set(email, { otp: generatedOtp, expires: Date.now() + 10 * 60 * 1000 });

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.USER,
            pass: process.env.PASSWORD
          },
        });

        // Simple Minimal Maroon Template
        const emailHtml = `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #800000; margin-bottom: 20px;">Password Reset</h2>
          <p style="color: #333; font-size: 16px;">Hello,</p>
          <p style="color: #555; font-size: 14px; line-height: 1.5;">
            Please use the verification code below to reset your password. 
            This code is valid for 10 minutes.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #800000; border: 1px solid #800000; padding: 10px 20px; border-radius: 4px;">
              ${generatedOtp}
            </span>
          </div>
          <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; pt-10px; margin-top: 30px;">
            If you didn't request this, you can safely ignore this email.
          </p>
          <p style="font-size: 12px; color: #800000; font-weight: bold;">GreatWork</p>
        </div>
        `;

        await transporter.sendMail({
          from: `"GreatWork" <${process.env.USER}>`,
          to: email,
          subject: "Password Reset Code",
          html: emailHtml,
        });

        return NextResponse.json({ success: true, message: "OTP sent" });

      } catch (emailError: any) {
        console.error("EMAIL SEND ERROR:", emailError.message);
        return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
      }
    }

    // If no valid action
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("SERVER ERROR:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
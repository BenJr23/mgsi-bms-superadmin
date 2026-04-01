'use server'

import nodemailer from 'nodemailer'

export async function sendCredentialsEmail(input: {
  userEmail: string
  userName: string
  password: string
  emailType?: 'create' | 'reset' | 'reactivate'
}): Promise<boolean> {
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').replace(/\/$/, '')
    const logoUrl = 'https://static.wixstatic.com/media/0f0d2b_a16c66e8204b4a4a9aa7d1c5eb937db7~mv2.png'
    const emailType = input.emailType ?? 'create'

    const subjectByType: Record<'create' | 'reset' | 'reactivate', string> = {
      create: 'GreatWork Spaces - Your Account Credentials',
      reset: 'GreatWork Spaces - Password Reset Credentials',
      reactivate: 'GreatWork Spaces - Reactivated Account Credentials',
    }

    const headingByType: Record<'create' | 'reset' | 'reactivate', string> = {
      create: 'Welcome to GreatWork Spaces',
      reset: 'Your Password Has Been Reset',
      reactivate: 'Your Account Has Been Reactivated',
    }

    const introByType: Record<'create' | 'reset' | 'reactivate', string> = {
      create: `Hi <strong>${input.userName}</strong>, your account has been created successfully.`,
      reset: `Hi <strong>${input.userName}</strong>, a new temporary password has been generated for your account.`,
      reactivate: `Hi <strong>${input.userName}</strong>, your account has been reactivated and new credentials are ready.`,
    }

    const textIntroByType: Record<'create' | 'reset' | 'reactivate', string> = {
      create: 'Your account has been successfully created. Below are your login credentials:',
      reset: 'A new temporary password has been generated for your account. Use the credentials below to sign in:',
      reactivate: 'Your account has been reactivated. Use the credentials below to sign in:',
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    const senderEmail = process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@example.com'

    await transporter.sendMail({
      from: `"GreatWork Spaces Inc." <${senderEmail}>`,
      to: input.userEmail,
      subject: subjectByType[emailType],
      html: `
        <div style="background-color: #ffffff; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
          <div style="max-width: 460px; margin: 0 auto; text-align: center;">
            <img src="${logoUrl}" alt="GreatWork" style="width: 140px; margin-bottom: 40px;" />

            <h1 style="font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 8px;">
              ${headingByType[emailType]}
            </h1>
            <p style="color: #666666; font-size: 16px; margin-bottom: 32px;">
              ${introByType[emailType]}
            </p>

            <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; border: 1px solid #eaeaea; margin-bottom: 24px; text-align: left;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #2d333a;"><strong>Email Address:</strong> ${input.userEmail}</p>
              <p style="margin: 0; font-size: 14px; color: #2d333a;"><strong>Temporary Password:</strong> ${input.password}</p>
            </div>

            <p style="font-size: 14px; color: #888888; margin-bottom: 28px;">
              Keep your credentials secure and change your password after your first login.
            </p>


            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />

            <p style="font-size: 12px; color: #b0b0b0; text-transform: uppercase; letter-spacing: 1px;">
              © ${new Date().getFullYear()} GreatWork Team
            </p>
          </div>
        </div>
      `,
      text: `
    ${subjectByType[emailType]}

Hi ${input.userName},

    ${textIntroByType[emailType]}

Email Address: ${input.userEmail}
Temporary Password: ${input.password}

Important:
Please keep your credentials safe and secure. We recommend changing your password after your first login.

Sign in at: ${appUrl}/sign-in

© 2026 GreatWork Spaces
      `,
    })

    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

'use server'

import nodemailer from 'nodemailer'
import dns from 'dns/promises'

const EMAIL_DEBUG = process.env.EMAIL_DEBUG === 'true'

type CompanyCreditAlertArgs = {
  to: string
  representativeName?: string | null
  companyName: string
  remainingHours: number
  allottedHours: number
  usedHours: number
}

async function createTransporter() {
  const origHost = process.env.SMTP_HOST || process.env.MAIL_HOST || process.env.HOST || 'smtp.gmail.com'
  let hostToUse = origHost

  try {
    const addrs = await dns.resolve4(origHost)
    if (addrs && addrs.length) hostToUse = addrs[0]
  } catch {
    // Fallback to original host
  }

  const rawPort = process.env.SMTP_PORT || process.env.MAIL_PORT || process.env.PORT
  const parsed = Number(rawPort)
  const knownSmtpPorts = [25, 465, 587, 2525]
  const port = !Number.isNaN(parsed) && knownSmtpPorts.includes(parsed) ? parsed : 587
  const secure = (process.env.SMTP_SECURE || process.env.SECURE) === 'true'

  return nodemailer.createTransport({
    host: hostToUse,
    port,
    secure,
    auth: process.env.GMAIL_USER
      ? { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      : undefined,
    tls: { servername: origHost },
  })
}

export async function sendCompanyCreditAlertEmail(args: CompanyCreditAlertArgs): Promise<void> {
  if (!args.to) {
    if (EMAIL_DEBUG) {
      console.log('[company-credit-email] skipped: missing recipient email')
    }
    return
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').replace(/\/$/, '')
  const logoUrl = 'https://static.wixstatic.com/media/0f0d2b_a16c66e8204b4a4a9aa7d1c5eb937db7~mv2.png'
  const subject = `Credit Alert: ${args.companyName} has ${args.remainingHours.toFixed(2)} hours remaining`

  const html = `
    <div style="background-color: #ffffff; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
      <div style="max-width: 460px; margin: 0 auto; text-align: center;">
        <img src="${logoUrl}" alt="GreatWork" style="width: 140px; margin-bottom: 40px;" />

        <h1 style="font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 8px;">
          Credit Balance Alert
        </h1>
        <p style="color: #666666; font-size: 16px; margin-bottom: 32px;">
          Hi <strong>${args.representativeName || 'Representative'}</strong>, this is an update for
          <strong>${args.companyName}</strong>.
        </p>

        <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; border: 1px solid #eaeaea; margin-bottom: 24px; text-align: left;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #2d333a;"><strong>Allotted Hours:</strong> ${args.allottedHours.toFixed(2)}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #2d333a;"><strong>Used Hours:</strong> ${args.usedHours.toFixed(2)}</p>
          <p style="margin: 0; font-size: 14px; color: #2d333a;"><strong>Remaining Hours:</strong> ${args.remainingHours.toFixed(2)}</p>
        </div>

        <p style="font-size: 14px; color: #888888; margin-bottom: 28px;">
          Please coordinate with your administrator if additional hours are required to avoid service interruption.
        </p>



        <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />

        <p style="font-size: 12px; color: #b0b0b0; text-transform: uppercase; letter-spacing: 1px;">
          © ${new Date().getFullYear()} GreatWork Team
        </p>
      </div>
    </div>
  `

  const text = `Hi ${args.representativeName || 'Representative'},\n\n` +
    `Your company ${args.companyName} has reached the credit threshold.\n` +
    `Allotted Hours: ${args.allottedHours.toFixed(2)}\n` +
    `Used Hours: ${args.usedHours.toFixed(2)}\n` +
    `Remaining Hours: ${args.remainingHours.toFixed(2)}\n\n` +
    `Please coordinate with your admin if additional hours are needed.\n` +
    `${appUrl}`

  try {
    const transporter = await createTransporter()
    const senderEmail = process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@example.com'
    if (EMAIL_DEBUG) {
      console.log('[company-credit-email] sending', {
        to: args.to,
        companyName: args.companyName,
        remainingHours: args.remainingHours,
      })
    }

    const info = await transporter.sendMail({
      from: `"GreatWork Spaces Inc." <${senderEmail}>`,
      to: args.to,
      subject,
      text,
      html,
    })

    if (EMAIL_DEBUG) {
      console.log('[company-credit-email] sent', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      })
    }
  } catch (error) {
    console.error('Company credit alert email failed:', error)
  }
}

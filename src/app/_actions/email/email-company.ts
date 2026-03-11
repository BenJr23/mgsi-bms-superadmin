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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const subject = `Credit Alert: ${args.companyName} has ${args.remainingHours.toFixed(2)} hours remaining`

const html = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #800000; padding: 24px; text-align: center;">
        <h2 style="margin: 0; color: #ffffff; font-size: 20px; letter-spacing: 1px; text-transform: uppercase;">Credit Alert</h2>
      </div>

      <div style="background-color: #ffffff; padding: 32px; color: #1f2937;">
        <p style="margin: 0 0 16px; font-size: 16px;">Hi <strong>${args.representativeName || 'Representative'}</strong>,</p>
        
        <p style="margin: 0 0 20px; line-height: 1.5;">
          This is an automated notification regarding the credit balance for <strong>${args.companyName}</strong>. 
          The account has reached its designated credit threshold.
        </p>

        <div style="background-color: #f9fafb; border-left: 4px solid #800000; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Allotted Hours</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${args.allottedHours.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">Used Hours</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${args.usedHours.toFixed(2)}</td>
            </tr>
            <tr style="font-size: 18px; color: #800000;">
              <td style="padding: 12px 0 0; font-weight: bold;">Remaining</td>
              <td style="padding: 12px 0 0; text-align: right; font-weight: bold;">${args.remainingHours.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">
          Please coordinate with your administrator if additional hours are required to avoid service interruption.
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
    if (EMAIL_DEBUG) {
      console.log('[company-credit-email] sending', {
        to: args.to,
        companyName: args.companyName,
        remainingHours: args.remainingHours,
      })
    }

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@example.com',
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

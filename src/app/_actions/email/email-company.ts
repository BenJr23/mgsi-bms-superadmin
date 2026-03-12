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
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          }
          .header {
            background: linear-gradient(135deg, #7c2d12 0%, #b91c1c 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
          }
          .details-box {
            background-color: #f3f4f6;
            border-left: 4px solid #b91c1c;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .details-row:last-child {
            margin-bottom: 0;
          }
          .details-row .label {
            color: #6b7280;
          }
          .details-row .value {
            color: #1f2937;
            font-weight: 600;
          }
          .details-row.total {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #d1d5db;
            font-size: 17px;
          }
          .details-row.total .label,
          .details-row.total .value {
            color: #b91c1c;
            font-weight: 700;
          }
          .important {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 14px;
          }
          .important strong {
            color: #b91c1c;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #b91c1c;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GreatWork Spaces Credit Alert</h1>
          </div>
          <div class="content">
            <div class="greeting">
              <p>Hi <strong>${args.representativeName || 'Representative'}</strong>,</p>
              <p>
                This is an automated notification regarding the credit balance for
                <strong>${args.companyName}</strong>.
              </p>
            </div>

            <div class="details-box">
              <div class="details-row">
                <span class="label">Allotted Hours</span>
                <span class="value">${args.allottedHours.toFixed(2)}</span>
              </div>
              <div class="details-row">
                <span class="label">Used Hours</span>
                <span class="value">${args.usedHours.toFixed(2)}</span>
              </div>
              <div class="details-row total">
                <span class="label">Remaining Hours</span>
                <span class="value">${args.remainingHours.toFixed(2)}</span>
              </div>
            </div>

            <div class="important">
              <strong>Important:</strong>
              <p>
                Please coordinate with your administrator if additional hours are
                required to avoid service interruption.
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${appUrl}/companies" class="button">View Company Dashboard</a>
            </div>

            <div class="footer">
              <p>© 2026 GreatWork Spaces. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
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

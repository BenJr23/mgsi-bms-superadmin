'use server'

import nodemailer from 'nodemailer'
import dns from 'dns/promises'

type SendBookingEmailArgs = {
    to: string
    name?: string | null
    bookingReference: string
    status: 'CONFIRMED' | 'RESCHEDULED'
    adminMessage?: string | null
    startDate: string
    endDate: string
    dailyTimeStart?: string | null
    dailyTimeEnd?: string | null
    buildingName: string
    roomName: string
}

async function createTransporter() {
    const origHost = process.env.HOST || 'smtp.gmail.com'
    let hostToUse = origHost

    try {
        const addrs = await dns.resolve4(origHost)
        if (addrs && addrs.length) hostToUse = addrs[0]
    } catch (e) {
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
        tls: {
            servername: origHost,
        },
    })
}

export async function sendBookingStatusEmail(args: SendBookingEmailArgs): Promise<void> {
    const { 
        to, name, bookingReference, status, adminMessage, 
        startDate, endDate, dailyTimeStart, dailyTimeEnd, 
        buildingName, roomName 
    } = args

    if (!to) return

    const statusText =
        status === 'CONFIRMED'
            ? 'confirmed'
            : 'rescheduled'
    const statusHeading =
        status === 'CONFIRMED'
            ? 'Confirmed'
            : 'Rescheduled'
    const statusColor =
        status === 'CONFIRMED'
            ? '#059669'
            : '#d97706'

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const logoUrl = 'https://static.wixstatic.com/media/0f0d2b_a16c66e8204b4a4a9aa7d1c5eb937db7~mv2.png'
    const subject = `Booking ${bookingReference} ${statusHeading}`
    
    const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`
    const timeRange = dailyTimeStart && dailyTimeEnd ? `${dailyTimeStart} - ${dailyTimeEnd}` : '12:00 AM - 12:00 AM'
    const messagePrefix = ''

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
                        .header img {
                            height: 40px;
                            display: block;
                            margin: 0 auto 10px;
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
                        .status {
                            font-weight: 700;
                        }
                        .details-box {
                            background-color: #f3f4f6;
                            border-left: 4px solid #b91c1c;
                            padding: 20px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .details-box p {
                            margin: 8px 0;
                            font-size: 14px;
                            color: #1f2937;
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
                        .admin-note {
                            margin: 20px 0;
                            padding: 12px;
                            background: #f0fdf4;
                            border-left: 4px solid #4ade80;
                            font-style: italic;
                            border-radius: 4px;
                            color: #14532d;
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
                            <img src="${logoUrl}" alt="GreatWork" />
                            <h1>Booking ${statusHeading}</h1>
                        </div>
                        <div class="content">
                            <div class="greeting">
                                <p>Hi <strong>${name || 'there'}</strong>,</p>
                                <p>
                                    ${messagePrefix}Your booking <strong>${bookingReference}</strong> has been
                                    <strong class="status" style="color: ${statusColor};">${statusText}</strong>.
                                </p>
                            </div>

                            <div class="details-box">
                                <p><strong>Location:</strong> ${buildingName} - ${roomName}</p>
                                <p><strong>Date:</strong> ${dateRange}</p>
                                <p><strong>Time:</strong> ${timeRange}</p>
                            </div>

                            ${adminMessage ? `<div class="admin-note">${adminMessage}</div>` : ''}

                            <div class="important">
                                <strong>Notice:</strong>
                                <p>Rebooking is only possible up to 30 minutes before your scheduled booking time.</p>
                            </div>

                            <div style="text-align: center;">
                                <a href="${appUrl}/bookings" class="button">View Your Bookings</a>
                            </div>

                            <div class="footer">
                                <p>© 2026 GreatWork Spaces. All rights reserved.</p>
                                <p>If you didn't expect this email, please contact support.</p>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `

    const text = `Hi ${name || 'there'},\n\nYour booking ${bookingReference} has been ${statusText}.\n\nDetails:\n- Location: ${buildingName}, ${roomName}\n- Date: ${dateRange}\n- Time: ${timeRange}\n\nNotice: Rebooking is only possible up to 30 minutes before your scheduled booking time.\n\nView details at: ${appUrl}`

    try {
        const transporter = await createTransporter()
        await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@example.com',
            to,
            subject,
            text,
            html,
        })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Email notification failed:', msg)
    }
}
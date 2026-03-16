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

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').replace(/\/$/, '')
    const logoUrl = 'https://static.wixstatic.com/media/0f0d2b_a16c66e8204b4a4a9aa7d1c5eb937db7~mv2.png'
    const subject = `Booking ${bookingReference} ${statusHeading}`
    
    const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`
    const timeRange = dailyTimeStart && dailyTimeEnd ? `${dailyTimeStart} - ${dailyTimeEnd}` : '12:00 AM - 12:00 AM'
    const messagePrefix = ''

        const html = `
            <div style="background-color: #ffffff; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
                <div style="max-width: 460px; margin: 0 auto; text-align: center;">
                    <img src="${logoUrl}" alt="GreatWork" style="width: 140px; margin-bottom: 40px;" />

                    <h1 style="font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 8px;">
                        Booking ${statusHeading}
                    </h1>
                    <p style="color: #666666; font-size: 16px; margin-bottom: 32px;">
                        Hi <strong>${name || 'there'}</strong>, your booking <strong>${bookingReference}</strong> has been
                        <strong style="color: ${statusColor};">${statusText}</strong>.
                    </p>

                    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; border: 1px solid #eaeaea; margin-bottom: 24px; text-align: left;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #2d333a;"><strong>Location:</strong> ${buildingName} - ${roomName}</p>
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #2d333a;"><strong>Date:</strong> ${dateRange}</p>
                        <p style="margin: 0; font-size: 14px; color: #2d333a;"><strong>Time:</strong> ${timeRange}</p>
                    </div>

                    ${adminMessage ? `<div style="background-color: #f8f9fa; border-radius: 12px; padding: 16px; border: 1px solid #eaeaea; margin-bottom: 24px; text-align: left; color: #2d333a;">${adminMessage}</div>` : ''}

                    <p style="font-size: 14px; color: #888888; margin-bottom: 28px;">
                        Rebooking is only possible up to <span style="color: #1a1a1a; font-weight: 600;">30 minutes</span> before your scheduled booking time.
                    </p>

       

                    <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 40px 0;" />

                    <p style="font-size: 12px; color: #b0b0b0; text-transform: uppercase; letter-spacing: 1px;">
                        © ${new Date().getFullYear()} GreatWork Team
                    </p>
                </div>
            </div>
        `

    const text = `Hi ${name || 'there'},\n\nYour booking ${bookingReference} has been ${statusText}.\n\nDetails:\n- Location: ${buildingName}, ${roomName}\n- Date: ${dateRange}\n- Time: ${timeRange}\n\nNotice: Rebooking is only possible up to 30 minutes before your scheduled booking time.\n\nView details at: ${appUrl}`

    try {
        const transporter = await createTransporter()
        const senderEmail = process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@example.com'
        await transporter.sendMail({
            from: `"GreatWork Spaces Inc." <${senderEmail}>`,
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
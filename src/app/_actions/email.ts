'use server'

import nodemailer from 'nodemailer'
import dns from 'dns/promises'

type SendBookingEmailArgs = {
    to: string
    name?: string | null
    bookingReference: string
    approved: boolean
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
        auth: process.env.USER
            ? { user: process.env.USER, pass: process.env.PASSWORD }
            : undefined,
        tls: {
            servername: origHost,
        },
    })
}

export async function sendBookingStatusEmail(args: SendBookingEmailArgs): Promise<void> {
    const { 
        to, name, bookingReference, approved, adminMessage, 
        startDate, endDate, dailyTimeStart, dailyTimeEnd, 
        buildingName, roomName 
    } = args

    if (!to) return

    const statusText = approved ? 'approved' : 'rejected'
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const logoUrl = 'https://static.wixstatic.com/media/0f0d2b_a16c66e8204b4a4a9aa7d1c5eb937db7~mv2.png'
    const subject = `Booking ${bookingReference} ${statusText}`
    
    const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`
    const timeRange = dailyTimeStart && dailyTimeEnd ? `${dailyTimeStart} - ${dailyTimeEnd}` : '12:00 AM - 12:00 AM'
    const messagePrefix = approved ? '' : "We're sorry to inform you that "

    const html = `
        <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:680px;margin:0 auto;color:#374151">
          <div style="text-align:center;padding:20px 24px;background:#f3f4f6;border-radius:8px 8px 0 0;color:#1e3a8a">
            <img src="${logoUrl}" alt="GreatWork" style="height:40px;display:block;margin:0 auto 8px" />
            <h3 style="margin:0;font-size:18px">Booking ${approved ? 'Approved' : 'Rejected'}</h3>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e6edf3;border-top:none">
            <p style="margin:0 0 12px">Hi ${name || 'there'},</p>
            <p style="margin:0 0 12px">${messagePrefix}Your booking <strong>${bookingReference}</strong> has been <strong style="color:${approved ? '#059669' : '#dc2626'}">${statusText}</strong>.</p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h4 style="margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #1e3a8a;">Booking Details</h4>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Location:</strong> ${buildingName} - ${roomName}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${dateRange}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Time:</strong> ${timeRange}</p>
            </div>

            ${adminMessage ? `<p style="margin:12px 0; padding:12px; background:#f0fdf4; border-left:4px solid #4ade80; font-style: italic;">${adminMessage}</p>` : ''}
            
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                    <strong>Notice:</strong> Rebooking is only possible up to 30 minutes before your scheduled booking time.
                </p>
            </div>

            <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0" />
            <p style="margin:0;color:#6b7280;font-size:13px">If you didn't expect this email, please contact support.</p>
          </div>
          <div style="text-align:center;padding:12px 16px;color:#9ca3af;font-size:12px">GreatWork • <a href="${appUrl}" style="color:inherit;text-decoration:underline">${appUrl}</a></div>
        </div>
    `

    const text = `Hi ${name || 'there'},\n\nYour booking ${bookingReference} has been ${statusText}.\n\nDetails:\n- Location: ${buildingName}, ${roomName}\n- Date: ${dateRange}\n- Time: ${timeRange}\n\nNotice: Rebooking is only possible up to 30 minutes before your scheduled booking time.\n\nView details at: ${appUrl}`

    try {
        const transporter = await createTransporter()
        await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.USER || 'no-reply@example.com',
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
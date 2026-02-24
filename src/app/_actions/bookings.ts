'use server'

import { ApprovalStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import dns from 'dns/promises'

export type BookingListItem = {
    id: string
    bookingReference: string
    startDate: string
    endDate: string
    bookingType: string
    approvalStatus: ApprovalStatus
    building: { name: string }
    room: { name: string }
    submittedBy: { name: string | null; email: string }
    updatedBy?: { id: string; name?: string | null } | null
}

interface GetBookingsResult {
    success: boolean
    data?: BookingListItem[]
    error?: string
}

interface UpdateBookingApprovalResult {
    success: boolean
    data?: {
        id: string
        approvalStatus: ApprovalStatus
        updatedById: string | null
    }
    error?: string
}

// transporter will be created on-demand using an IPv4 address when possible
async function createTransporter() {
    const origHost = process.env.HOST || 'smtp.gmail.com'
    let hostToUse = origHost

    try {
        const addrs = await dns.resolve4(origHost)
        if (addrs && addrs.length) hostToUse = addrs[0]
    } catch (e) {
        // couldn't resolve IPv4, fallback to original host (may resolve to IPv6)
    }

    // Pick SMTP port: prefer SMTP-specific env vars, and avoid using the app PORT (e.g. 3000)
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

export async function getBookings(): Promise<GetBookingsResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const bookings = await prisma.booking.findMany({
            where: {
                isActive: true,
                deletedAt: null,
            },
            include: {
                building: {
                    select: {
                        buildingName: true,
                    },
                },
                room: {
                    select: {
                        roomName: true,
                    },
                },
                submittedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                updatedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        const formatted: BookingListItem[] = bookings.map((booking) => ({
            id: booking.id,
            bookingReference: booking.bookingReference,
            startDate: booking.startDate.toISOString(),
            endDate: booking.endDate.toISOString(),
            bookingType: booking.bookingType,
            approvalStatus: booking.approvalStatus,
            building: { name: booking.building.buildingName },
            room: { name: booking.room.roomName },
            submittedBy: {
                name: booking.submittedBy.name,
                email: booking.submittedBy.email,
            },
            updatedBy: booking.updatedBy
                ? {
                        id: booking.updatedBy.id,
                        name: booking.updatedBy.name,
                    }
                : null,
        }))

        return { success: true, data: formatted }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch bookings.'
        console.error('Get bookings error:', message)
        return {
            success: false,
            error: message,
        }
    }
}

export async function updateBookingApprovalStatus(
    bookingId: string,
    approvalStatus: ApprovalStatus
): Promise<UpdateBookingApprovalResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized.' }
        }

        if (!bookingId?.trim()) {
            return { success: false, error: 'Booking ID is required.' }
        }

        if (approvalStatus !== 'APPROVED' && approvalStatus !== 'REJECTED') {
            return { success: false, error: 'Invalid approval status.' }
        }

        const updatedBooking = await prisma.booking.update({
            where: { 
                id: bookingId,
                deletedAt: null 
            },
            data: {
                approvalStatus,
                updatedById: session.user.id,
                approvalDate: new Date(),
            },
            include: {
                submittedBy: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        })

        if (updatedBooking.submittedBy?.email) {
            const ref = updatedBooking.bookingReference || ''
            const isApproved = approvalStatus === 'APPROVED'
            const subject = `Booking ${ref} ${isApproved ? 'approved' : 'rejected'}`
            const statusText = isApproved ? 'approved' : 'rejected'
            const messagePrefix = isApproved ? '' : "We're sorry to inform you that "

            const html = `
                <p>Hi ${updatedBooking.submittedBy.name || 'there'},</p>
                <p>${messagePrefix}Your booking <strong>${ref}</strong> has been ${statusText}.</p>
            `

            try {
                const transporter = await createTransporter()
                await transporter.sendMail({
                    from: process.env.FROM_EMAIL || process.env.USER || 'no-reply@example.com',
                    to: updatedBooking.submittedBy.email,
                    subject,
                    html,
                })
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error('Email notification failed:', msg)
            }
        }

        return {
            success: true,
            data: {
                id: updatedBooking.id,
                approvalStatus: updatedBooking.approvalStatus,
                updatedById: updatedBooking.updatedById,
            },
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update booking status.'
        console.error('Update booking approval error:', message)
        return {
            success: false,
            error: message,
        }
    }
}
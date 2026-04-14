import { revalidateTag } from 'next/cache'
import { invalidateCompaniesStatsCache } from '../companies'
import { sendBookingStatusEmail } from '../email/email-bookings'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'
import { invalidateBookingsCache } from './cache'
import { hasScheduleConflict } from './conflicts'
import { getBlockedWeekendDate } from './date-time'
import type { CreateWalkInBookingInput, CreateWalkInBookingResult } from './types'
import type { Prisma } from '@/generated/prisma/client'

function getWalkInBookingPrefix(buildingCode: string, bookingDate: Date): string {
    const year = bookingDate.getFullYear()
    const month = bookingDate.getMonth() + 1
    const day = bookingDate.getDate()

    return `${buildingCode}-${year}-${month}-${day}-`
}

async function generateWalkInBookingReference(
    tx: Prisma.TransactionClient,
    buildingCode: string,
    bookingDate: Date
): Promise<string> {
    const prefix = getWalkInBookingPrefix(buildingCode, bookingDate)

    const lastBooking = await tx.booking.findFirst({
        where: {
            bookingReference: {
                startsWith: prefix,
            },
        },
        orderBy: {
            bookingReference: 'desc',
        },
        select: {
            bookingReference: true,
        },
    })

    let nextSeries = 1
    if (lastBooking?.bookingReference) {
        const lastSeries = Number.parseInt(lastBooking.bookingReference.slice(-4), 10)
        if (Number.isFinite(lastSeries)) {
            nextSeries = lastSeries + 1
        }
    }

    return `${prefix}${String(nextSeries).padStart(4, '0')}`
}

export async function createWalkInBooking(input: CreateWalkInBookingInput): Promise<CreateWalkInBookingResult> {
    try {
        const session = await getServerSession()

        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated.' }
        }

        const {
            email,
            name,
            phoneNumber,
            companyName,
            buildingId,
            roomId,
            bookingType,
            startDate,
            endDate,
            dailyTimeStart,
            dailyTimeEnd,
            attendeeCount,
            message,
        } = input

        if (!email?.trim() || !name?.trim()) {
            return { success: false, error: 'Client email and name are required.' }
        }

        if (!buildingId?.trim() || !roomId?.trim()) {
            return { success: false, error: 'Building and room are required.' }
        }

        if (!startDate || !endDate) {
            return { success: false, error: 'Start and end dates are required.' }
        }

        if (startDate >= endDate) {
            return { success: false, error: 'End date must be after start date.' }
        }

        if (bookingType !== 'HOURLY' && bookingType !== 'DAILY') {
            return { success: false, error: 'Invalid booking type.' }
        }

        const blockedWeekendDate = getBlockedWeekendDate(startDate, endDate)
        if (blockedWeekendDate) {
            return {
                success: false,
                error: `Booking creation is not allowed on Saturdays and Sundays. Blocked date: ${blockedWeekendDate}.`,
            }
        }

        if (bookingType === 'DAILY') {
            if (!dailyTimeStart || !dailyTimeEnd) {
                return { success: false, error: 'Daily booking requires start and end times.' }
            }

            if (dailyTimeStart >= dailyTimeEnd) {
                return { success: false, error: 'Daily end time must be after start time.' }
            }
        }

        const [building, room, overlappingBookings] = await Promise.all([
            prisma.building.findFirst({
                where: { id: buildingId, deletedAt: null },
                select: { id: true, buildingName: true, buildingCode: true },
            }),
            prisma.room.findFirst({
                where: { id: roomId, buildingId, deletedAt: null },
                select: { id: true, roomName: true, capacity: true },
            }),
            prisma.booking.findMany({
                where: {
                    roomId,
                    isActive: true,
                    deletedAt: null,
                    approvalStatus: { in: ['RESCHEDULED', 'CONFIRMED'] },
                    startDate: { lt: endDate },
                    endDate: { gt: startDate },
                },
                select: {
                    id: true,
                    bookingReference: true,
                    bookingType: true,
                    startDate: true,
                    endDate: true,
                    dailyTimeStart: true,
                    dailyTimeEnd: true,
                },
                orderBy: { startDate: 'asc' },
            }),
        ])

        if (!building) {
            return { success: false, error: 'Building not found.' }
        }

        if (!room) {
            return { success: false, error: 'Room not found in the specified building.' }
        }

        if (attendeeCount && attendeeCount > room.capacity) {
            return {
                success: false,
                error: `Attendee count exceeds room capacity (${room.capacity}).`,
            }
        }

        const conflictingBooking = overlappingBookings.find((booking) =>
            hasScheduleConflict(input, booking)
        )

        if (conflictingBooking) {
            return {
                success: false,
                error: `Selected schedule conflicts with existing booking ${conflictingBooking.bookingReference}.`,
            }
        }

        const normalizedEmail = email.toLowerCase().trim()
        const newBooking = await prisma.$transaction(async (tx) => {
            const walkInCustomer = await tx.walkInCustomer.upsert({
                where: { email: normalizedEmail },
                update: {
                    name: name.trim(),
                    companyName: companyName?.trim() || null,
                    phoneNumber: phoneNumber?.trim() || null,
                    deletedAt: null,
                },
                create: {
                    email: normalizedEmail,
                    name: name.trim(),
                    companyName: companyName?.trim() || null,
                    phoneNumber: phoneNumber?.trim() || null,
                },
                select: { id: true },
            })

            const bookingReference = await generateWalkInBookingReference(tx, building.buildingCode, startDate)

            return tx.booking.create({
                data: {
                    bookingReference,
                    submittedById: session.user.id,
                    walkInCustomerId: walkInCustomer.id,
                    buildingId,
                    roomId,
                    startDate,
                    endDate,
                    dailyTimeStart: bookingType === 'DAILY' ? dailyTimeStart : null,
                    dailyTimeEnd: bookingType === 'DAILY' ? dailyTimeEnd : null,
                    bookingType,
                    clientStatus: 'SUBMITTED',
                    approvalStatus: 'CONFIRMED',
                    submittedAt: new Date(),
                    updatedById: session.user.id,
                    attendeeCount: attendeeCount ?? null,
                    message: message?.trim() || null,
                    isActive: true,
                },
                include: {
                    submittedBy: {
                        select: { email: true, name: true },
                    },
                    building: { select: { buildingName: true } },
                    room: { select: { roomName: true } },
                },
            })
        })

        await invalidateCompaniesStatsCache()
        await invalidateBookingsCache()
        revalidateTag('bookings', 'max')

        // Send booking confirmation email to the customer (non-blocking)
        void sendBookingStatusEmail({
            to: normalizedEmail,
            name: name.trim(),
            bookingReference: newBooking.bookingReference,
            status: 'CONFIRMED',
            startDate: newBooking.startDate.toLocaleDateString(),
            endDate: newBooking.endDate.toLocaleDateString(),
            dailyTimeStart: newBooking.dailyTimeStart
                ? newBooking.dailyTimeStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : newBooking.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dailyTimeEnd: newBooking.dailyTimeEnd
                ? newBooking.dailyTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : newBooking.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            buildingName: newBooking.building.buildingName,
            roomName: newBooking.room.roomName,
        }).catch((err) => {
            console.error('Walk-in booking confirmation email failed:', err)
        })

        return {
            success: true,
            data: {
                id: newBooking.id,
                bookingReference: newBooking.bookingReference,
                approvalStatus: newBooking.approvalStatus,
            },
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create walk-in booking.'
        console.error('Create walk-in booking error:', message)
        return { success: false, error: message }
    }
}
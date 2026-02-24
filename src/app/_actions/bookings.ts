'use server'

import { ApprovalStatus } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/get-server'
import { prisma } from '@/lib/prisma'

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

		const booking = await prisma.booking.findFirst({
			where: {
				id: bookingId,
				deletedAt: null,
			},
			select: {
				id: true,
			},
		})

		if (!booking) {
			return { success: false, error: 'Booking not found.' }
		}

		const updatedBooking = await prisma.booking.update({
			where: { id: bookingId },
			data: {
				approvalStatus,
				updatedById: session.user.id,
				approvalDate: new Date(),
			},
			select: {
				id: true,
				approvalStatus: true,
				updatedById: true,
			},
		})

		return {
			success: true,
			data: updatedBooking,
		}
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to update booking status.'
		console.error('Update booking approval error:', message)
		return {
			success: false,
			error: message,
		}
	}
}

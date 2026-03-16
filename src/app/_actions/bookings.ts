'use server'

import type { ApprovalStatus } from '@/generated/prisma/client'
import {
    createWalkInBooking as createWalkInBookingImpl,
} from './bookings/create-walk-in-booking'
import { getBookings as getBookingsImpl } from './bookings/get-bookings'
import { getBuildings as getBuildingsImpl } from './bookings/get-buildings'
import { getRoomUnavailableSlots as getRoomUnavailableSlotsImpl } from './bookings/get-room-unavailable-slots'
import { getRoomsByBuilding as getRoomsByBuildingImpl } from './bookings/getRoomsByBuilding'
import {
    updateBookingApprovalStatus as updateBookingApprovalStatusImpl,
} from './bookings/update-booking-approval-status'
import type {
    CreateWalkInBookingInput,
    CreateWalkInBookingResult,
    GetBookingsInput,
    GetBookingsResult,
    GetRoomUnavailableSlotsInput,
    GetRoomUnavailableSlotsResult,
    GetRoomsByBuildingInput,
    GetRoomsResult,
    GetBuildingsResult,
    UpdateBookingApprovalResult,
} from './bookings/types'

export type {
    BookingListItem,
    BookingRow,
    Building,
    Room,
    RoomUnavailableSlot,
} from './bookings/types'

export async function getBookingsCached(input: GetBookingsInput = {}): Promise<GetBookingsResult> {
    return getBookingsImpl(input)
}

export async function getBookings(input: GetBookingsInput = {}): Promise<GetBookingsResult> {
    return getBookingsImpl(input)
}

export async function getBuildings(): Promise<GetBuildingsResult> {
    return getBuildingsImpl()
}

export async function getRoomsByBuilding(input: GetRoomsByBuildingInput): Promise<GetRoomsResult> {
    return getRoomsByBuildingImpl(input)
}

export async function createWalkInBooking(input: CreateWalkInBookingInput): Promise<CreateWalkInBookingResult> {
    return createWalkInBookingImpl(input)
}

export async function updateBookingApprovalStatus(
    bookingId: string,
    approvalStatus: ApprovalStatus,
    message?: string
): Promise<UpdateBookingApprovalResult> {
    return updateBookingApprovalStatusImpl(bookingId, approvalStatus, message)
}

export async function getRoomUnavailableSlots(
    input: GetRoomUnavailableSlotsInput
): Promise<GetRoomUnavailableSlotsResult> {
    return getRoomUnavailableSlotsImpl(input)
}
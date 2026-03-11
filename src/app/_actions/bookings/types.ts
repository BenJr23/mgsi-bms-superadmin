import type { ApprovalStatus, BookingType } from '@/generated/prisma/client'

export type BookingListItem = {
    id: string
    bookingReference: string
    startDate: string
    endDate: string
    dailyTimeStart?: string | null
    dailyTimeEnd?: string | null
    bookingType: string
    isWalkIn: boolean
    clientStatus: string
    approvalStatus: ApprovalStatus
    submittedAt: string
    approvalDate?: string | null
    cancellationDeadline?: string | null
    message?: string | null
    attendeeCount?: number | null
    building: { name: string }
    room: { name: string }
    submittedBy: { name: string | null; email: string; companyName?: string | null }
    updatedBy?: { id: string; name?: string | null } | null
}

export type BookingRow = BookingListItem & {
    _display: {
        dateRange: string
        timeRange: string
        submittedAt: string
        approvalDate: string
        cancellationDeadline: string
        startDateForExport: string
        endDateForExport: string
        startTimeForExport: string
        endTimeForExport: string
        startYear: number | null
        startMonth: number | null
    }
}

export interface GetBookingsResult {
    success: boolean
    data?: BookingListItem[]
    page?: number
    pageSize?: number
    totalCount?: number
    totalPages?: number
    error?: string
}

export interface GetBookingsInput {
    page?: number
    pageSize?: number
    companyId?: string
    buildingId?: string
    roomId?: string
    status?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
    query?: string
}

export interface UpdateBookingApprovalResult {
    success: boolean
    data?: {
        id: string
        approvalStatus: ApprovalStatus
        updatedById: string | null
    }
    error?: string
}

export interface CreateWalkInBookingResult {
    success: boolean
    data?: {
        id: string
        bookingReference: string
        approvalStatus: ApprovalStatus
    }
    error?: string
}

export interface CreateWalkInBookingInput {
    email: string
    name: string
    phoneNumber?: string
    companyName?: string
    buildingId: string
    roomId: string
    bookingType: 'HOURLY' | 'DAILY'
    startDate: Date
    endDate: Date
    dailyTimeStart?: Date
    dailyTimeEnd?: Date
    attendeeCount?: number
    message?: string
}

export type ConflictCheckBooking = {
    id: string
    bookingReference: string
    bookingType: BookingType
    startDate: Date
    endDate: Date
    dailyTimeStart: Date | null
    dailyTimeEnd: Date | null
}

export type Building = {
    id: string
    buildingName: string
    buildingCode: string
    status: string
}

export type Room = {
    id: string
    roomName: string
    roomCode: string | null
    capacity: number
    status: string
    buildingId: string
}

export interface GetBuildingsResult {
    success: boolean
    data?: Building[]
    error?: string
}

export interface GetRoomsResult {
    success: boolean
    data?: Room[]
    error?: string
}

export interface GetRoomsByBuildingInput {
    buildingId: string
}

export type RoomUnavailableSlot = {
    date: string
    startTime: string
    endTime: string
    startMinute: number
    endMinute: number
    bookingReference: string
    bookingType: BookingType
}

export interface GetRoomUnavailableSlotsInput {
    roomId: string
    dateStart: string
    dateEnd?: string
}

export interface GetRoomUnavailableSlotsResult {
    success: boolean
    data?: RoomUnavailableSlot[]
    error?: string
}
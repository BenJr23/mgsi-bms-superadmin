import type { ConflictCheckBooking, CreateWalkInBookingInput, RoomUnavailableSlot } from './types'
import {
    dateKeyToOrdinal,
    formatDailyWallClockLabel,
    formatMinutesAsLabel,
    ordinalToDateKey,
    toDailyWallClockMinutes,
    toManilaDateKey,
    toManilaMinutes,
} from './date-time'

function rangesOverlapExclusive(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && startB < endA
}

function rangesOverlapInclusive(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA <= endB && startB <= endA
}

export function hasScheduleConflict(
    input: CreateWalkInBookingInput,
    existingBooking: ConflictCheckBooking
): boolean {
    const requestIsDaily = input.bookingType === 'DAILY'
    const existingIsDaily = existingBooking.bookingType === 'DAILY'

    if (!requestIsDaily && !existingIsDaily) {
        return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
    }

    const requestStartDay = dateKeyToOrdinal(toManilaDateKey(input.startDate))
    const requestEndDay = dateKeyToOrdinal(toManilaDateKey(input.endDate))
    const existingStartDay = dateKeyToOrdinal(toManilaDateKey(existingBooking.startDate))
    const existingEndDay = dateKeyToOrdinal(toManilaDateKey(existingBooking.endDate))

    if (!rangesOverlapInclusive(requestStartDay, requestEndDay, existingStartDay, existingEndDay)) {
        return false
    }

    if (requestIsDaily && existingIsDaily) {
        if (!input.dailyTimeStart || !input.dailyTimeEnd || !existingBooking.dailyTimeStart || !existingBooking.dailyTimeEnd) {
            return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
        }

        const requestStartMinutes = toDailyWallClockMinutes(input.dailyTimeStart)
        const requestEndMinutes = toDailyWallClockMinutes(input.dailyTimeEnd)
        const existingStartMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeStart)
        const existingEndMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeEnd)

        return rangesOverlapExclusive(requestStartMinutes, requestEndMinutes, existingStartMinutes, existingEndMinutes)
    }

    if (requestIsDaily && !existingIsDaily) {
        if (!input.dailyTimeStart || !input.dailyTimeEnd) {
            return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
        }

        const requestStartMinutes = toDailyWallClockMinutes(input.dailyTimeStart)
        const requestEndMinutes = toDailyWallClockMinutes(input.dailyTimeEnd)
        const existingStartMinutes = toManilaMinutes(existingBooking.startDate)
        const existingEndMinutes = toManilaMinutes(existingBooking.endDate)

        return rangesOverlapExclusive(requestStartMinutes, requestEndMinutes, existingStartMinutes, existingEndMinutes)
    }

    if (!existingBooking.dailyTimeStart || !existingBooking.dailyTimeEnd) {
        return input.startDate < existingBooking.endDate && existingBooking.startDate < input.endDate
    }

    const requestStartMinutes = toManilaMinutes(input.startDate)
    const requestEndMinutes = toManilaMinutes(input.endDate)
    const existingStartMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeStart)
    const existingEndMinutes = toDailyWallClockMinutes(existingBooking.dailyTimeEnd)

    return rangesOverlapExclusive(requestStartMinutes, requestEndMinutes, existingStartMinutes, existingEndMinutes)
}

export function getBookingSlotsForDateRange(
    booking: ConflictCheckBooking,
    requestStartOrdinal: number,
    requestEndOrdinal: number
): RoomUnavailableSlot[] {
    const slots: RoomUnavailableSlot[] = []
    const bookingStartOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.startDate))
    const bookingEndOrdinal = dateKeyToOrdinal(toManilaDateKey(booking.endDate))

    const startOrdinal = Math.max(requestStartOrdinal, bookingStartOrdinal)
    const endOrdinal = Math.min(requestEndOrdinal, bookingEndOrdinal)

    if (startOrdinal > endOrdinal) {
        return slots
    }

    if (booking.bookingType === 'DAILY' && booking.dailyTimeStart && booking.dailyTimeEnd) {
        const startMinute = toDailyWallClockMinutes(booking.dailyTimeStart)
        const endMinute = toDailyWallClockMinutes(booking.dailyTimeEnd)
        const startTimeLabel = formatDailyWallClockLabel(booking.dailyTimeStart)
        const endTimeLabel = formatDailyWallClockLabel(booking.dailyTimeEnd)

        for (let day = startOrdinal; day <= endOrdinal; day += 1) {
            slots.push({
                date: ordinalToDateKey(day),
                startTime: startTimeLabel,
                endTime: endTimeLabel,
                startMinute,
                endMinute,
                bookingReference: booking.bookingReference,
                bookingType: booking.bookingType,
            })
        }

        return slots
    }

    const bookingStartMinute = toManilaMinutes(booking.startDate)
    const bookingEndMinute = toManilaMinutes(booking.endDate)

    for (let day = startOrdinal; day <= endOrdinal; day += 1) {
        const isFirstDay = day === bookingStartOrdinal
        const isLastDay = day === bookingEndOrdinal

        const startMinutes = isFirstDay ? bookingStartMinute : 0
        const endMinutes = isLastDay ? bookingEndMinute : 24 * 60

        if (startMinutes >= endMinutes) {
            continue
        }

        slots.push({
            date: ordinalToDateKey(day),
            startTime: formatMinutesAsLabel(startMinutes),
            endTime: formatMinutesAsLabel(endMinutes),
            startMinute: startMinutes,
            endMinute: endMinutes,
            bookingReference: booking.bookingReference,
            bookingType: booking.bookingType,
        })
    }

    return slots
}
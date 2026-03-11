const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

const MANILA_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
})

const MANILA_AMPM_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
})

const MANILA_WEEKEND_DAYS = new Set([0, 6])

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? ''
}

export function toManilaDateKey(date: Date): string {
    const parts = MANILA_DATE_FORMATTER.formatToParts(date)
    const year = getPartValue(parts, 'year')
    const month = getPartValue(parts, 'month')
    const day = getPartValue(parts, 'day')
    return `${year}-${month}-${day}`
}

export function toManilaMinutes(date: Date): number {
    const parts = MANILA_TIME_FORMATTER.formatToParts(date)
    const hour = Number(getPartValue(parts, 'hour'))
    const minute = Number(getPartValue(parts, 'minute'))
    return (hour * 60) + minute
}

export function toDailyWallClockMinutes(date: Date): number {
    return (date.getUTCHours() * 60) + date.getUTCMinutes()
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return null
    }

    const [year, month, day] = dateKey.split('-').map(Number)
    if (!year || !month || !day) {
        return null
    }

    return { year, month, day }
}

export function dateKeyToOrdinal(dateKey: string): number {
    const [year, month, day] = dateKey.split('-').map(Number)
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

export function formatMinutesAsLabel(minutes: number): string {
    if (minutes >= 24 * 60) {
        return '11:59 PM'
    }

    const safeMinutes = Math.max(0, minutes)
    const hour = Math.floor(safeMinutes / 60)
    const minute = safeMinutes % 60
    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`
}

export function formatManilaTimeLabel(date: Date): string {
    return MANILA_AMPM_TIME_FORMATTER.format(date)
}

export function formatDailyWallClockLabel(date: Date): string {
    return formatMinutesAsLabel(toDailyWallClockMinutes(date))
}

export function ordinalToDateKey(ordinal: number): string {
    return toManilaDateKey(new Date(ordinal * 86400000))
}

function isWeekendDateKey(dateKey: string): boolean {
    const parsed = parseDateKey(dateKey)
    if (!parsed) return false

    const dayOfWeek = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0)).getUTCDay()
    return MANILA_WEEKEND_DAYS.has(dayOfWeek)
}

export function getBlockedWeekendDate(startDate: Date, endDate: Date): string | null {
    const startOrdinal = dateKeyToOrdinal(toManilaDateKey(startDate))
    const endOrdinal = dateKeyToOrdinal(toManilaDateKey(endDate))

    for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
        const dateKey = ordinalToDateKey(ordinal)
        if (isWeekendDateKey(dateKey)) {
            return dateKey
        }
    }

    return null
}

export function formatDateManilaShort(dt: Date): string {
    return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
    })
}

export function formatTimeLabel(dt: Date, timeZone: string): string {
    return dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
    })
}

export function formatDateTimeManila(dt: Date): string {
    return dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    })
}

export function formatDateRangeManila(start: Date, end: Date): string {
    const startText = formatDateManilaShort(start)
    const endText = formatDateManilaShort(end)
    if (startText === endText) return startText

    const startYear = start.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Manila' })
    const endYear = end.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Manila' })
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Manila' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Manila' })

    if (startYear === endYear && startMonth === endMonth) {
        const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' })
        const endDay = end.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' })
        return `${startMonth} ${startDay} - ${endDay}, ${startYear}`
    }

    if (startYear === endYear) {
        const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' })
        return `${startMonth} ${startDay} - ${endText}`
    }

    return `${startText} - ${endText}`
}
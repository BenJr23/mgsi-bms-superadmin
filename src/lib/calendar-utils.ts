export type CalendarDay = {
	date: number
	month: number
	year: number
	isCurrentMonth: boolean
	isToday: boolean
	isWeekend: boolean
	dateString: string // YYYY-MM-DD format
}

export function generateCalendarGrid(year: number, month: number): CalendarDay[] {
	const firstDayOfMonth = new Date(year, month, 1)
	const lastDayOfMonth = new Date(year, month + 1, 0)
	const firstDayWeekday = firstDayOfMonth.getDay() // 0 = Sunday
	const daysInMonth = lastDayOfMonth.getDate()

	const today = new Date()
	const todayString = formatDateString(today.getFullYear(), today.getMonth(), today.getDate())

	const days: CalendarDay[] = []

	// Previous month trailing days
	const prevMonthLastDay = new Date(year, month, 0).getDate()
	const prevMonth = month === 0 ? 11 : month - 1
	const prevYear = month === 0 ? year - 1 : year

	for (let i = firstDayWeekday - 1; i >= 0; i--) {
		const date = prevMonthLastDay - i
		const dateString = formatDateString(prevYear, prevMonth, date)
		const dayOfWeek = new Date(prevYear, prevMonth, date).getDay()
		days.push({
			date,
			month: prevMonth,
			year: prevYear,
			isCurrentMonth: false,
			isToday: false,
			isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			dateString,
		})
	}

	// Current month days
	for (let date = 1; date <= daysInMonth; date++) {
		const dateString = formatDateString(year, month, date)
		const dayOfWeek = new Date(year, month, date).getDay()
		days.push({
			date,
			month,
			year,
			isCurrentMonth: true,
			isToday: dateString === todayString,
			isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			dateString,
		})
	}

	// Next month leading days (fill to 35 or 42 cells)
	const remainingDays = 35 - days.length
	const nextMonth = month === 11 ? 0 : month + 1
	const nextYear = month === 11 ? year + 1 : year

	for (let date = 1; date <= remainingDays; date++) {
		const dateString = formatDateString(nextYear, nextMonth, date)
		const dayOfWeek = new Date(nextYear, nextMonth, date).getDay()
		days.push({
			date,
			month: nextMonth,
			year: nextYear,
			isCurrentMonth: false,
			isToday: false,
			isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
			dateString,
		})
	}

	return days
}

export function formatDateString(year: number, month: number, date: number): string {
	const y = year.toString()
	const m = (month + 1).toString().padStart(2, '0')
	const d = date.toString().padStart(2, '0')
	return `${y}-${m}-${d}`
}

export function formatMonthYear(year: number, month: number): string {
	const date = new Date(year, month)
	return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function isBookingOnDate(bookingStart: string, bookingEnd: string, dateString: string): boolean {
	const targetDate = new Date(dateString + 'T00:00:00')
	const startDate = new Date(bookingStart)
	const endDate = new Date(bookingEnd)

	// Reset time parts for date-only comparison
	targetDate.setHours(0, 0, 0, 0)
	const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
	const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

	return targetDate >= startDay && targetDate <= endDay
}

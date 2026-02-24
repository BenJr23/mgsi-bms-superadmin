'use client';

import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getCalendarBookings, type CalendarBooking } from '@/app/_actions/calendar';
import {
	generateCalendarGrid,
	formatMonthYear,
	isBookingOnDate,
	type CalendarDay,
} from '@/lib/calendar-utils';
import { ViewCalendarModal } from './Modals/ViewCalendarModal';

export function CalendarView() {
	const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
	const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
	const [bookings, setBookings] = useState<CalendarBooking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	useEffect(() => {
		const fetchBookings = async () => {
			setLoading(true);
			setError(null);
			try {
				const result = await getCalendarBookings(currentYear, currentMonth);
				if (result.success) {
					setBookings(result.data || []);
				} else {
					setError(result.error || 'Failed to fetch bookings');
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'An error occurred');
			} finally {
				setLoading(false);
			}
		};
		fetchBookings();
	}, [currentYear, currentMonth]);

	const goToPreviousMonth = () => {
		if (currentMonth === 0) {
			setCurrentMonth(11);
			setCurrentYear(currentYear - 1);
		} else {
			setCurrentMonth(currentMonth - 1);
		}
	};

	const goToNextMonth = () => {
		if (currentMonth === 11) {
			setCurrentMonth(0);
			setCurrentYear(currentYear + 1);
		} else {
			setCurrentMonth(currentMonth + 1);
		}
	};

	const goToToday = () => {
		const today = new Date();
		setCurrentYear(today.getFullYear());
		setCurrentMonth(today.getMonth());
	};

	const calendarDays = generateCalendarGrid(currentYear, currentMonth);

	const getBookingsForDay = (day: CalendarDay): CalendarBooking[] => {
		return bookings.filter((booking) =>
			isBookingOnDate(booking.startDate, booking.endDate, day.dateString)
		);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'APPROVED':
				return 'bg-emerald-100 text-emerald-700 border-emerald-500';
			case 'PENDING':
				return 'bg-amber-100 text-amber-700 border-amber-500';
			case 'REJECTED':
				return 'bg-rose-100 text-rose-700 border-rose-500';
			default:
				return 'bg-slate-100 text-slate-700 border-slate-500';
		}
	};

	const handleDayClick = (day: CalendarDay) => {
		if (!day.isCurrentMonth) return;
		setSelectedDay(day);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedDay(null);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
					<p className="text-slate-500">View booking schedules and availability.</p>
				</div>
				<div className="flex gap-2 flex-wrap">
					<div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm w-full sm:w-auto">
						<button
							onClick={goToPreviousMonth}
							className="p-2 hover:bg-slate-50 text-slate-600 border-r border-slate-200"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						<span className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-900 whitespace-nowrap">
							{formatMonthYear(currentYear, currentMonth)}
						</span>
						<button
							onClick={goToNextMonth}
							className="p-2 hover:bg-slate-50 text-slate-600 border-l border-slate-200"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
					<Button
						variant="outline"
						onClick={goToToday}
						className="hidden sm:flex flex-1 sm:flex-none"
					>
						Today
					</Button>
					<Button className="flex-1 sm:flex-none">+ Book</Button>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{error}
				</div>
			)}

			<Card noPadding className="flex flex-col overflow-hidden">
				{/* Days Header */}
				<div className="grid grid-cols-7 border-b border-slate-200">
					{days.map((day) => (
						<div
							key={day}
							className="py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-slate-500 border-r border-slate-100 last:border-r-0"
						>
							<span className="hidden sm:inline">{day}</span>
							<span className="sm:hidden">{day.charAt(0)}</span>
						</div>
					))}
				</div>

				{/* Calendar Grid */}
				{loading ? (
					<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
						<Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
						<p className="text-slate-500">Loading calendar...</p>
					</div>
				) : (
					<div className="grid grid-cols-7 grid-rows-5 flex-1 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
						{calendarDays.map((day, i) => {
							const dayBookings = getBookingsForDay(day);
							return (
								<div
									key={`${day.dateString}-${i}`}
									onClick={() => handleDayClick(day)}
									className={`border-b border-r border-slate-100 p-1 sm:p-2 relative transition-colors ${
										i % 7 === 6 ? 'border-r-0' : ''
									} ${
										day.isWeekend
											? 'bg-slate-50/50'
											: day.isCurrentMonth
											? 'hover:bg-slate-50 cursor-pointer'
											: 'bg-slate-50/30'
									}`}
								>
									<span
										className={`text-xs sm:text-sm font-medium ${
											day.isToday
												? 'bg-indigo-600 text-white w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full'
												: day.isCurrentMonth
												? 'text-slate-700'
												: 'text-slate-400'
										} ${day.isWeekend && day.isCurrentMonth && !day.isToday ? 'text-slate-500' : ''}`}
									>
										{day.date}
									</span>

									{dayBookings.length > 0 && (
										<div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
											{dayBookings.slice(0, 3).map((booking) => (
												<div
													key={booking.id}
													className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate border-l-2 cursor-pointer hover:opacity-80 ${getStatusColor(
														booking.approvalStatus
													)}`}
													title={`${booking.roomName} - ${booking.buildingName}`}
												>
													<span className="hidden sm:inline">
														{booking.roomName}
													</span>
													<span className="sm:hidden">•</span>
												</div>
											))}
											{dayBookings.length > 3 && (
												<div className="text-[10px] text-slate-500 font-medium">
													+{dayBookings.length - 3} more
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</Card>

			{selectedDay && (
				<ViewCalendarModal
					isOpen={isModalOpen}
					onClose={closeModal}
					date={selectedDay.dateString}
					bookings={getBookingsForDay(selectedDay)}
				/>
			)}
		</div>
	);
}
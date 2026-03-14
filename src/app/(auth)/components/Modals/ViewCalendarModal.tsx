'use client';

import React from 'react';
import { X, Calendar, MapPin, User, Clock, Building2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { CalendarBooking } from '@/app/_actions/calendar';

interface ViewCalendarModalProps {
	isOpen: boolean;
	onClose: () => void;
	date: string; // YYYY-MM-DD format
	bookings: CalendarBooking[];
}

export function ViewCalendarModal({ isOpen, onClose, date, bookings }: ViewCalendarModalProps) {
	if (!isOpen) return null;
	const DISPLAY_TIMEZONE = 'Asia/Manila';

	const formatDate = (dateString: string) => {
		const d = new Date(dateString + 'T00:00:00');
		return d.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: DISPLAY_TIMEZONE,
		});
	};

	const formatTime = (isoString: string, timeZone: string) => {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return '--:--';
		return d.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true,
			timeZone,
		});
	};

	const getTimeRange = (booking: CalendarBooking) => {
		const startValue = booking.dailyTimeStart || booking.startDate;
		const endValue = booking.dailyTimeEnd || booking.endDate;
		const startTz = booking.dailyTimeStart ? 'UTC' : DISPLAY_TIMEZONE;
		const endTz = booking.dailyTimeEnd ? 'UTC' : DISPLAY_TIMEZONE;
		return `${formatTime(startValue, startTz)} - ${formatTime(endValue, endTz)}`;
	};

	const getStatusVariant = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return 'success';
			case 'RESCHEDULED':
				return 'warning';
			default:
				return 'default';
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
			<div
				className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-200 flex flex-col"
				style={{
					animation: 'modalIn 0.18s ease-out',
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100">
							<Calendar className="w-5 h-5 text-indigo-600" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								Bookings for {formatDate(date)}
							</h2>
							<p className="text-sm text-slate-500">
								{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}{' '}
								scheduled
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					{bookings.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
								<Calendar className="w-8 h-8 text-slate-400" />
							</div>
							<h3 className="text-lg font-medium text-slate-900 mb-1">No Bookings</h3>
							<p className="text-sm text-slate-500">
								There are no bookings scheduled for this date.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{bookings.map((booking) => (
								<div
									key={booking.id}
									className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
								>
									<div className="flex items-start justify-between mb-3">
										<div>
											<h3 className="font-semibold text-slate-900 mb-1">
												{booking.bookingReference}
											</h3>
											<Badge variant={getStatusVariant(booking.approvalStatus)}>
												{booking.approvalStatus}
											</Badge>
										</div>
									</div>

									<div className="space-y-2 text-sm">
										{/* Room & Building */}
										<div className="flex items-center gap-2 text-slate-600">
											<MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
											<span className="font-medium text-slate-900">
												{booking.roomName}
											</span>
											<span className="text-slate-400">•</span>
											<span>{booking.buildingName}</span>
										</div>

										{/* Time Slot */}
										<div className="flex items-center gap-2 text-slate-600">
											<Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
											<span>
												{getTimeRange(booking)}
											</span>
										</div>

										{/* Company Name (New Separate Row) */}
										{booking.companyName && (
											<div className="flex items-center gap-2 text-slate-600">
												<Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
												<span className="font-medium text-slate-700">{booking.companyName}</span>
											</div>
										)}

										{/* Submitted By */}
										{booking.submittedByName && (
											<div className="flex items-center gap-2 text-slate-600">
												<User className="w-4 h-4 text-slate-400 flex-shrink-0" />
												<span>Submitted by: {booking.submittedByName}</span>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end px-6 py-4 border-t border-slate-100">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
					>
						Close
					</button>
				</div>
			</div>

			<style>{`
				@keyframes modalIn {
					from { opacity: 0; transform: scale(0.96) translateY(8px); }
					to   { opacity: 1; transform: scale(1) translateY(0); }
				}
			`}</style>
		</div>
	);
}

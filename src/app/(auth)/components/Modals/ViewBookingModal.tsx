import React from 'react';
import { CalendarCheck2, Clock3, Building2, Mail, UserRound, MessageSquare, Users } from 'lucide-react';

interface ViewBookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	details: {
		bookingReference: string;
		isWalkIn?: boolean;
		submittedByName: string;
		submittedByEmail: string;
		clientCompany?: string | null;
		buildingName: string;
		roomName: string;
		bookingType: string;
		clientStatus: string;
		approvalStatus: string;
		dateRange: string;
		timeRange: string;
		submittedAt: string;
		approvalDate?: string | null;
		cancellationDeadline?: string | null;
		attendeeCount?: number | null;
		message?: string | null;
		updatedByName?: string | null;
	};
}

export function ViewBookingModal({ isOpen, onClose, details }: ViewBookingModalProps) {
	if (!isOpen) return null;

	const approvalTone =
		details.approvalStatus === 'APPROVED'
			? 'bg-emerald-50 text-emerald-700 border-emerald-200'
			: details.approvalStatus === 'REJECTED'
				? 'bg-rose-50 text-rose-700 border-rose-200'
				: 'bg-amber-50 text-amber-700 border-amber-200';

	const clientTone =
		details.clientStatus === 'SUBMITTED'
			? 'bg-indigo-50 text-indigo-700 border-indigo-200'
			: 'bg-slate-100 text-slate-700 border-slate-200';

	const bookingTypeTone =
		details.bookingType === 'DAILY'
			? 'bg-cyan-50 text-cyan-700 border-cyan-200'
			: 'bg-violet-50 text-violet-700 border-violet-200';

	const sourceTone = details.isWalkIn
		? 'bg-sky-50 text-sky-700 border-sky-200'
		: 'bg-slate-100 text-slate-700 border-slate-200';

	const Field = ({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) => (
		<div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
			<p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
				{icon}
				<span>{label}</span>
			</p>
			<p className="mt-1 text-sm font-medium text-slate-900 break-words">{value}</p>
		</div>
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-3 sm:p-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
				<div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 sticky top-0 bg-white z-10">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
								<CalendarCheck2 className="w-5 h-5" />
							</div>
							<div>
								<h3 className="text-xl font-semibold text-slate-900">Booking Details</h3>
								<p className="text-slate-500 text-sm mt-0.5">Reference: {details.bookingReference}</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
						>
							Close
						</button>
					</div>

					<div className="mt-4 flex flex-wrap gap-2">
						<span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${approvalTone}`}>
							Approval: {details.approvalStatus}
						</span>
						<span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${clientTone}`}>
							Client: {details.clientStatus}
						</span>
						<span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${bookingTypeTone}`}>
							Type: {details.bookingType}
						</span>
						<span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${sourceTone}`}>
							Source: {details.isWalkIn ? 'Walk-in' : 'Online'}
						</span>
					</div>
				</div>

				<div className="p-4 sm:p-6 space-y-4 text-sm overflow-y-auto">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
						<Field label={details.isWalkIn ? 'Walk-in Client' : 'Client'} value={details.submittedByName} icon={<UserRound className="w-3.5 h-3.5" />} />
						<Field label={details.isWalkIn ? 'Walk-in Email' : 'Email'} value={details.submittedByEmail} icon={<Mail className="w-3.5 h-3.5" />} />
						<Field label="Company" value={details.clientCompany || 'None'} icon={<Building2 className="w-3.5 h-3.5" />} />
						<Field label="Building" value={details.buildingName} icon={<Building2 className="w-3.5 h-3.5" />} />
						<Field label="Room" value={details.roomName} icon={<Building2 className="w-3.5 h-3.5" />} />
						<Field label="Attendees" value={details.attendeeCount ?? '-'} icon={<Users className="w-3.5 h-3.5" />} />
						<Field label="Date" value={details.dateRange} icon={<CalendarCheck2 className="w-3.5 h-3.5" />} />
						<Field label="Time" value={details.timeRange} icon={<Clock3 className="w-3.5 h-3.5" />} />
						<Field label="Submitted At" value={details.submittedAt} />
						<Field label="Approved At" value={details.approvalDate || '-'} />
						<Field label="Cancellation Deadline" value={details.cancellationDeadline || '-'} />
						<Field label="Updated By" value={details.updatedByName || '-'} />
					</div>

					<div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
						<p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
							<MessageSquare className="w-3.5 h-3.5" />
							<span>Message</span>
						</p>
						<p className="mt-1 text-sm font-medium text-slate-900 whitespace-pre-wrap">
							{details.message || '-'}
						</p>
					</div>
				</div>

				<div className="flex justify-end p-3 sm:p-4 border-t border-slate-200 sticky bottom-0 bg-white z-10">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

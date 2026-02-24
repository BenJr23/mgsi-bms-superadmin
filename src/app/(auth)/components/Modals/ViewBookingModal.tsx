import React from 'react';

interface ViewBookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	details: {
		bookingReference: string;
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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-3 sm:p-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col">
				<div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 sticky top-0 bg-white z-10">
					<h3 className="text-xl font-semibold text-slate-900">Booking Details</h3>
					<p className="text-slate-500 text-sm mt-1">Reference: {details.bookingReference}</p>
				</div>

				<div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm overflow-y-auto">
					<div>
						<p className="text-slate-500">Client</p>
						<p className="text-slate-900 font-medium">{details.submittedByName}</p>
					</div>
					<div>
						<p className="text-slate-500">Email</p>
						<p className="text-slate-900 font-medium">{details.submittedByEmail}</p>
					</div>
					<div>
						<p className="text-slate-500">Client Company</p>
						<p className="text-slate-900 font-medium">{details.clientCompany || 'None'}</p>
					</div>
					<div>
						<p className="text-slate-500">Building</p>
						<p className="text-slate-900 font-medium">{details.buildingName}</p>
					</div>
					<div>
						<p className="text-slate-500">Room</p>
						<p className="text-slate-900 font-medium">{details.roomName}</p>
					</div>
					<div>
						<p className="text-slate-500">Date</p>
						<p className="text-slate-900 font-medium">{details.dateRange}</p>
					</div>
					<div>
						<p className="text-slate-500">Time</p>
						<p className="text-slate-900 font-medium">{details.timeRange}</p>
					</div>
					<div>
						<p className="text-slate-500">Booking Type</p>
						<p className="text-slate-900 font-medium">{details.bookingType}</p>
					</div>
					<div>
						<p className="text-slate-500">Client Status</p>
						<p className="text-slate-900 font-medium">{details.clientStatus}</p>
					</div>
					<div>
						<p className="text-slate-500">Approval Status</p>
						<p className="text-slate-900 font-medium">{details.approvalStatus}</p>
					</div>
					<div>
						<p className="text-slate-500">Attendees</p>
						<p className="text-slate-900 font-medium">{details.attendeeCount ?? '-'}</p>
					</div>
					<div>
						<p className="text-slate-500">Submitted At</p>
						<p className="text-slate-900 font-medium">{details.submittedAt}</p>
					</div>
					<div>
						<p className="text-slate-500">Approved At</p>
						<p className="text-slate-900 font-medium">{details.approvalDate || '-'}</p>
					</div>
					<div>
						<p className="text-slate-500">Cancellation Deadline</p>
						<p className="text-slate-900 font-medium">{details.cancellationDeadline || '-'}</p>
					</div>
					<div>
						<p className="text-slate-500">Updated By</p>
						<p className="text-slate-900 font-medium">{details.updatedByName || '-'}</p>
					</div>
					<div className="sm:col-span-2">
						<p className="text-slate-500">Message</p>
						<p className="text-slate-900 font-medium whitespace-pre-wrap">{details.message || '-'}</p>
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

import React from 'react'
import { Eye } from 'lucide-react'
import { Badge } from '../ui/Badge'

export function BookingsTable<T extends {
  id: string
  bookingReference: string
  room: { name: string }
  building: { name: string }
  submittedBy: { name: string | null; email: string; companyName?: string | null }
  clientStatus: string
  approvalStatus: 'RESCHEDULED' | 'CONFIRMED'
  _display: { dateRange: string; timeRange: string }
}>(props: {
  bookings: T[]
  onView: (booking: T) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 w-[150px]">Reference</th>
            <th className="px-6 py-3">Client</th>
            <th className="px-6 py-3">Location</th>
            <th className="px-6 py-3">Date & Time</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {props.bookings.map((booking) => {
            const statusLabel = booking.clientStatus === 'CANCELLED' ? 'CANCELLED' : booking.approvalStatus
            const statusVariant =
              statusLabel === 'CONFIRMED' ? 'success' : statusLabel === 'CANCELLED' ? 'danger' : 'warning'

            return (
            <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900 max-w-[150px]">
                <span className="block truncate" title={booking.bookingReference}>
                  {booking.bookingReference}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-600">
                {booking.submittedBy.companyName ? (
                  <>
                    <div className="text-slate-900 font-medium">{booking.submittedBy.companyName}</div>
                    <div className="text-xs text-slate-500">
                      {booking.submittedBy.name || booking.submittedBy.email}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-900 font-medium">
                    {booking.submittedBy.name || booking.submittedBy.email}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-slate-900 font-medium">{booking.room.name}</div>
                <div className="text-xs text-slate-500">{booking.building.name}</div>
              </td>
              <td className="px-6 py-4 text-slate-600 min-w-[240px]">
                <div>{booking._display.dateRange}</div>
                <div className="text-xs text-slate-400">{booking._display.timeRange}</div>
              </td>
              <td className="px-6 py-4">
                <Badge
                  variant={statusVariant}
                >
                  {statusLabel}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      props.onView(booking)
                    }}
                    className="p-1 hover:bg-sky-100 text-sky-600 rounded-full"
                    title="View booking"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


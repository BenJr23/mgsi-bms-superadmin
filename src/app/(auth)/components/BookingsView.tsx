import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Search, Filter, MoreHorizontal, Check, X } from 'lucide-react';
export function BookingsView() {
  const bookings = [
  {
    id: 'BK-9001',
    client: 'TechStart Inc',
    building: 'Innovation Hub',
    room: 'Conf Room A',
    start: '2023-10-25 09:00',
    end: '2023-10-25 17:00',
    type: 'DAILY',
    status: 'PENDING'
  },
  {
    id: 'BK-9002',
    client: 'Global Corp',
    building: 'Innovation Hub',
    room: 'Auditorium',
    start: '2023-10-26 14:00',
    end: '2023-10-26 16:00',
    type: 'HOURLY',
    status: 'APPROVED'
  },
  {
    id: 'BK-9003',
    client: 'Freelance Co',
    building: 'Downtown Center',
    room: 'Desk 12',
    start: '2023-11-01',
    end: '2023-11-30',
    type: 'MONTHLY',
    status: 'APPROVED'
  },
  {
    id: 'BK-9004',
    client: 'Event Planners',
    building: 'West Wing',
    room: 'Banquet Hall',
    start: '2023-10-28 18:00',
    end: '2023-10-28 23:00',
    type: 'HOURLY',
    status: 'REJECTED'
  },
  {
    id: 'BK-9005',
    client: 'Startup Studio',
    building: 'Innovation Hub',
    room: 'Lab 3',
    start: '2023-10-27 09:00',
    end: '2023-10-27 12:00',
    type: 'HOURLY',
    status: 'PENDING'
  },
  {
    id: 'BK-9006',
    client: 'Marketing Team',
    building: 'Downtown Center',
    room: 'Meeting B',
    start: '2023-10-29 10:00',
    end: '2023-10-29 11:00',
    type: 'HOURLY',
    status: 'CANCELLED'
  }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500">Manage and approve booking requests.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export</Button>
          <Button>+ New Booking</Button>
        </div>
      </div>

      <Card noPadding>
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bookings..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />

          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2">

              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking) =>
              <tr
                key={booking.id}
                className="hover:bg-slate-50 transition-colors group">

                  <td className="px-6 py-4 font-medium text-slate-900">
                    {booking.id}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{booking.client}</td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 font-medium">
                      {booking.room}
                    </div>
                    <div className="text-xs text-slate-500">
                      {booking.building}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="whitespace-nowrap">
                      {booking.start.split(' ')[0]}
                    </div>
                    <div className="text-xs text-slate-400">
                      {booking.type === 'MONTHLY' ?
                    'All Month' :
                    `${booking.start.split(' ')[1] || ''} - ${booking.end.split(' ')[1] || ''}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {booking.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                    variant={
                    booking.status === 'APPROVED' ?
                    'success' :
                    booking.status === 'PENDING' ?
                    'warning' :
                    booking.status === 'REJECTED' ?
                    'danger' :
                    'neutral'
                    }>

                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {booking.status === 'PENDING' ?
                  <div className="flex items-center justify-end gap-2">
                        <button
                      className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors"
                      title="Approve">

                          <Check className="w-4 h-4" />
                        </button>
                        <button
                      className="p-1 rounded-full hover:bg-rose-100 text-rose-600 transition-colors"
                      title="Reject">

                          <X className="w-4 h-4" />
                        </button>
                      </div> :

                  <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                  }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {bookings.map((booking) => (
            <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-slate-900 mb-1">{booking.id}</div>
                  <div className="text-sm text-slate-600">{booking.client}</div>
                </div>
                <Badge
                  variant={
                    booking.status === 'APPROVED'
                      ? 'success'
                      : booking.status === 'PENDING'
                        ? 'warning'
                        : booking.status === 'REJECTED'
                          ? 'danger'
                          : 'neutral'
                  }
                >
                  {booking.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-900 font-medium text-right">{booking.room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Building:</span>
                  <span className="text-slate-600 text-right">{booking.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-slate-600">{booking.start.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time:</span>
                  <span className="text-slate-600">
                    {booking.type === 'MONTHLY'
                      ? 'All Month'
                      : `${booking.start.split(' ')[1] || ''} - ${booking.end.split(' ')[1] || ''}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {booking.type}
                  </span>
                </div>
              </div>
              {booking.status === 'PENDING' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Approve</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors">
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">Reject</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">Showing 1-6 of 24 results</p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" disabled className="flex-1 sm:flex-none">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>);

}
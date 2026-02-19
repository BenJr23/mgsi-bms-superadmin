import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  Users,
  Building2,
  DoorOpen,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight } from
'lucide-react';
interface DashboardViewProps {
  onViewAllBookings?: () => void;
}

export function DashboardView({ onViewAllBookings }: DashboardViewProps) {
  const stats = [
  {
    label: 'Pending Bookings',
    value: '12',
    change: '+2.5%',
    trend: 'up',
    icon: CalendarClock,
    color: 'text-amber-600',
    bg: 'bg-amber-100'
  },
  {
    label: 'Active Buildings',
    value: '8',
    change: '0%',
    trend: 'neutral',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-100'
  },
  {
    label: 'Total Rooms',
    value: '142',
    change: '+4',
    trend: 'up',
    icon: DoorOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100'
  },
  {
    label: 'Occupancy Rate',
    value: '78%',
    change: '-1.2%',
    trend: 'down',
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100'
  }];

  const recentBookings = [
  {
    id: 'BK-7829',
    user: 'Acme Corp',
    room: 'Conference A',
    date: 'Oct 24, 2023',
    status: 'PENDING'
  },
  {
    id: 'BK-7828',
    user: 'Sarah Miller',
    room: 'Huddle 2',
    date: 'Oct 24, 2023',
    status: 'APPROVED'
  },
  {
    id: 'BK-7827',
    user: 'Tech Team',
    room: 'Main Hall',
    date: 'Oct 23, 2023',
    status: 'APPROVED'
  },
  {
    id: 'BK-7826',
    user: 'Design Dept',
    room: 'Studio B',
    date: 'Oct 23, 2023',
    status: 'REJECTED'
  },
  {
    id: 'BK-7825',
    user: 'John Doe',
    room: 'Desk 42',
    date: 'Oct 22, 2023',
    status: 'APPROVED'
  }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">
          Overview of your booking system performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {stat.value}
                  </h3>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {stat.trend === 'up' &&
                <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                }
                {stat.trend === 'down' &&
                <ArrowDownRight className="w-4 h-4 text-rose-500 mr-1" />
                }
                <span
                  className={
                  stat.trend === 'up' ?
                  'text-emerald-600' :
                  stat.trend === 'down' ?
                  'text-rose-600' :
                  'text-slate-600'
                  }>

                  {stat.change}
                </span>
                <span className="text-slate-400 ml-1">from last month</span>
              </div>
            </Card>);

        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2" noPadding>
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
            <button
              type="button"
              onClick={onViewAllBookings}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">

              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBookings.map((booking) =>
                <tr
                  key={booking.id}
                  className="hover:bg-slate-50 transition-colors">

                    <td className="px-6 py-4 font-medium text-slate-900">
                      {booking.id}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{booking.user}</td>
                    <td className="px-6 py-4 text-slate-600">{booking.room}</td>
                    <td className="px-6 py-4 text-slate-600">{booking.date}</td>
                    <td className="px-6 py-4">
                      <Badge
                      variant={
                      booking.status === 'APPROVED' ?
                      'success' :
                      booking.status === 'PENDING' ?
                      'warning' :
                      'danger'
                      }>

                        {booking.status}
                      </Badge>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions / Notifications */}
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  All Systems Operational
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last check: 2 mins ago
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Maintenance Scheduled
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Building C - HVAC update on Nov 1st
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
                  + Add Building
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>);

}
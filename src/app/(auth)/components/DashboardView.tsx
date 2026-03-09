'use client'

import React, { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Users, Building2, DoorOpen, CalendarClock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts'

import {
  getDashboardStats,
  getBookingAnalytics,
  getRecentBookings,
  type DashboardAnalyticsPoint,
  type RecentBooking,
} from '@/app/_actions/dashboard'

interface DashboardViewProps {
  onViewAllBookings?: () => void
}

export function DashboardView({ onViewAllBookings }: DashboardViewProps) {
  const [stats, setStats] = useState({
    pendingBookings: 0,
    activeBuildings: 0,
    totalRooms: 0,
    occupancyRate: 0,
  })

  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]
  )
  const [periodAnalytics, setPeriodAnalytics] = useState<DashboardAnalyticsPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [statsRes, recentRes] = await Promise.all([
        getDashboardStats(),
        getRecentBookings(),
      ])

      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (recentRes.success && recentRes.data) setRecentBookings(recentRes.data)

      setLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => {
    async function fetchAnalytics() {
      const analyticsRes = await getBookingAnalytics(period)
      if (analyticsRes.success && analyticsRes.data) {
        setPeriodAnalytics(analyticsRes.data)
      } else {
        setPeriodAnalytics([])
      }
    }

    fetchAnalytics()
  }, [period])

  const todayDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  /* CHART DATA */

  const chartData = periodAnalytics

  const totalPeriodBookings = chartData.reduce((sum, d) => sum + d.bookings, 0)

  const avgOccupancy =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.occupancy, 0) / chartData.length)
      : 0

  const bestPerformer =
    chartData.length > 0
      ? chartData.reduce((prev, current) =>
          prev.bookings > current.bookings ? prev : current
        )
      : { name: '-' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time booking overview</p>
        </div>
        <div className="text-sm text-slate-500">{todayDateLabel}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3 flex items-center gap-3">
          <CalendarClock className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="text-xs text-slate-500">Pending</p>
            <h3 className="text-xl font-bold text-slate-900">{stats.pendingBookings}</h3>
          </div>
        </Card>

        <Card className="p-3 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-green-600" />
          <div>
            <p className="text-xs text-slate-500">Buildings</p>
            <h3 className="text-xl font-bold text-slate-900">{stats.activeBuildings}</h3>
          </div>
        </Card>

        <Card className="p-3 flex items-center gap-3">
          <DoorOpen className="w-6 h-6 text-orange-600" />
          <div>
            <p className="text-xs text-slate-500">Rooms</p>
            <h3 className="text-xl font-bold text-slate-900">{stats.totalRooms}</h3>
          </div>
        </Card>

        <Card className="p-3 flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-600" />
          <div>
            <p className="text-xs text-slate-500">Occupancy</p>
            <h3 className="text-xl font-bold text-slate-900">{stats.occupancyRate}%</h3>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-slate-900">Booking Analytics</h3>
          <div className="flex bg-slate-100 rounded-lg p-1 text-sm">
            {['weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as 'weekly' | 'monthly')}
                className={`px-3 py-1 rounded-md ${
                  period === p
                    ? 'bg-white shadow text-indigo-600'
                    : 'text-slate-500'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <div className="rounded-lg border bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Period Bookings</p>
            <p className="text-lg font-bold text-slate-900">{totalPeriodBookings}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Avg Occupancy</p>
            <p className="text-lg font-bold text-slate-900">{avgOccupancy}%</p>
          </div>
          <div className="rounded-lg border bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Best Performer</p>
            <p className="text-lg font-bold text-slate-900">{bestPerformer.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
          <div className="lg:col-span-1 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="bookings"
                  fill="#6366f1"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#10b981"
                  strokeWidth={3}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card noPadding>
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
          <button
            onClick={onViewAllBookings}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-6">
            <div className="animate-pulse space-y-4">
              {[1,2,3,4,5].map((i)=>(
                <div key={i} className="h-12 bg-slate-200 rounded"/>
              ))}
            </div>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-500">
            No recent bookings found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentBookings.map((booking)=>(
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {booking.bookingReference}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {booking.submittedByName || 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {booking.submittedByCompany || '-'}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {booking.roomName}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {new Date(booking.date).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          booking.approvalStatus === 'APPROVED'
                            ? 'success'
                            : booking.approvalStatus === 'PENDING'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {booking.approvalStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
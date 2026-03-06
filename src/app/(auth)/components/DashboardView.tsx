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
  getRecentBookings,
  getTodayBookingsPerLocation,
  type RecentBooking,
  type TodayLocationCount,
} from '@/app/_actions/dashboard'

interface DashboardViewProps {
  onViewAllBookings?: () => void
}

/* COUNT ANIMATION */
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = target / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [target, duration])

  return count
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const animated = useCountUp(value)
  return (
    <>
      {animated}
      {suffix}
    </>
  )
}

export function DashboardView({ onViewAllBookings }: DashboardViewProps) {
  const [stats, setStats] = useState({
    pendingBookings: 0,
    activeBuildings: 0,
    totalRooms: 0,
    occupancyRate: 0,
  })

  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [todayBookings, setTodayBookings] = useState<TodayLocationCount[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'weekly' | 'monthly'>('today')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [statsRes, recentRes, todayRes] = await Promise.all([
        getDashboardStats(),
        getRecentBookings(),
        getTodayBookingsPerLocation(),
      ])

      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (recentRes.success && recentRes.data) setRecentBookings(recentRes.data)
      if (todayRes.success && todayRes.data) setTodayBookings(todayRes.data)

      setLoading(false)
    }

    fetchData()
  }, [])

  const totalTodayBookings = todayBookings.reduce((sum, loc) => sum + loc.total, 0)

  const todayDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  /* CHART DATA */

  const chartData =
    period === 'today'
      ? todayBookings.map((loc) => ({
          name: loc.location,
          bookings: loc.total,
          occupancy: 0,
        }))
      : period === 'weekly'
      ? [
          { name: 'Mon', bookings: 12, occupancy: 60 },
          { name: 'Tue', bookings: 19, occupancy: 75 },
          { name: 'Wed', bookings: 8, occupancy: 40 },
          { name: 'Thu', bookings: 15, occupancy: 70 },
          { name: 'Fri', bookings: 22, occupancy: 85 },
          { name: 'Sat', bookings: 9, occupancy: 45 },
          { name: 'Sun', bookings: 5, occupancy: 30 },
        ]
      : [
          { name: 'Week 1', bookings: 60, occupancy: 65 },
          { name: 'Week 2', bookings: 85, occupancy: 72 },
          { name: 'Week 3', bookings: 75, occupancy: 68 },
          { name: 'Week 4', bookings: 95, occupancy: 80 },
        ]

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
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">
          Overview of your booking system performance.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card className="p-4 flex items-center space-x-4">
          <CalendarClock className="w-6 h-6 text-indigo-600" />
          <div>
            <p className="text-sm text-slate-500">Pending Bookings</p>
            <h3 className="text-2xl font-bold">
              <AnimatedNumber value={stats.pendingBookings} />
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <Building2 className="w-6 h-6 text-green-600" />
          <div>
            <p className="text-sm text-slate-500">Active Buildings</p>
            <h3 className="text-2xl font-bold">
              <AnimatedNumber value={stats.activeBuildings} />
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <DoorOpen className="w-6 h-6 text-orange-600" />
          <div>
            <p className="text-sm text-slate-500">Total Rooms</p>
            <h3 className="text-2xl font-bold">
              <AnimatedNumber value={stats.totalRooms} />
            </h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <Users className="w-6 h-6 text-purple-600" />
          <div>
            <p className="text-sm text-slate-500">Occupancy Rate</p>
            <h3 className="text-2xl font-bold">
              <AnimatedNumber value={stats.occupancyRate} suffix="%" />
            </h3>
          </div>
        </Card>

      </div>

      {/* TODAY BOOKINGS SECTION */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* TOTAL BOOKINGS */}
        <Card className="p-6 bg-white border shadow-sm">
          <p className="text-sm text-slate-500">Total Bookings Today</p>

          <h2 className="text-4xl font-bold text-slate-900 mt-2">
            <AnimatedNumber value={totalTodayBookings} />
          </h2>

          <p className="text-xs text-slate-400 mt-2">
            {todayDateLabel}
          </p>
        </Card>

        {/* BOOKINGS BY LOCATION (GW1–GW4 COMBINED) */}
        <Card className="p-6 bg-white border shadow-sm">

          <h3 className="font-semibold text-slate-900 mb-4">
            Bookings by Location
          </h3>

          <div className="grid grid-cols-2 gap-4">

            {todayBookings.map((location) => (
              <div
                key={location.location}
                className="flex items-center justify-between bg-slate-50 p-4 rounded-lg"
              >
                <span className="text-sm font-medium text-slate-700">
                  {location.location}
                </span>

                <span className="text-lg font-bold text-indigo-600">
                  <AnimatedNumber value={location.total} />
                </span>
              </div>
            ))}

          </div>

        </Card>

      </div>

      {/* ANALYTICS */}

      <Card className="p-6">

        <div className="flex justify-between items-center mb-6">

          <h3 className="font-semibold text-slate-900">
            Booking Analytics
          </h3>

          <div className="flex bg-slate-100 rounded-lg p-1 text-sm">
            {['today', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as 'today' | 'weekly' | 'monthly')}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* BAR GRAPH */}

          <div className="lg:col-span-2 h-80">

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

                {period !== 'today' && (
                  <Line
                    type="monotone"
                    dataKey="occupancy"
                    stroke="#10b981"
                    strokeWidth={3}
                  />
                )}

              </BarChart>
            </ResponsiveContainer>

          </div>

          {/* SUMMARY */}

          <div className="space-y-4">

            <div className="p-4 rounded-xl bg-slate-50 border">
              <p className="text-sm text-slate-500">
                Total Period Bookings
              </p>

              <p className="text-2xl font-bold">
                <AnimatedNumber value={totalPeriodBookings} />
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border">
              <p className="text-sm text-slate-500">
                Average Occupancy
              </p>

              <p className="text-2xl font-bold">
                <AnimatedNumber value={avgOccupancy} suffix="%" />
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border">
              <p className="text-sm text-slate-500">
                Best Performer
              </p>

              <p className="text-xl font-semibold">
                {bestPerformer.name}
              </p>
            </div>

          </div>

        </div>

      </Card>

      {/* RECENT BOOKINGS (OLD TABLE UI) */}

      <Card noPadding>

        <div className="px-6 py-4 border-b flex justify-between items-center">

          <h3 className="font-semibold text-slate-900">
            Recent Bookings
          </h3>

          <button
            onClick={onViewAllBookings}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </button>

        </div>

        {loading ? (
          <div className="px-6 py-8">
            <div className="animate-pulse space-y-4">
              {[1,2,3,4,5].map((i)=>(
                <div key={i} className="h-12 bg-slate-200 rounded"/>
              ))}
            </div>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500">
            No recent bookings found.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm text-left">

              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentBookings.map((booking)=>(
                  <tr key={booking.id} className="hover:bg-slate-50">

                    <td className="px-6 py-4 font-medium text-slate-900">
                      {booking.bookingReference}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {booking.submittedByName || 'N/A'}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {booking.submittedByCompany || '-'}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {booking.roomName}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {new Date(booking.date).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4">
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
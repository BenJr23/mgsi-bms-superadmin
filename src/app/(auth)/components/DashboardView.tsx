'use client'

import React, { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Users, Building2, DoorOpen, CalendarClock } from 'lucide-react'
import { getDashboardStats, getRecentBookings, type RecentBooking } from '@/app/_actions/dashboard'
import { getTodayBookingsPerLocation, type TodayLocationCount } from '@/app/_actions/dashboard'

interface DashboardViewProps {
  onViewAllBookings?: () => void
}

export function DashboardView({ onViewAllBookings }: DashboardViewProps) {
  const [stats, setStats] = useState({
    pendingBookings: 0,
    activeBuildings: 0,
    totalRooms: 0,
    occupancyRate: 0,
    occupancyWindowLabel: 'THIS_WEEK' as 'THIS_WEEK' | 'NEXT_WEEK',
  })

  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [todayBookings, setTodayBookings] = useState<TodayLocationCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)

        const [statsResult, bookingsResult, todayResult] = await Promise.all([
          getDashboardStats(),
          getRecentBookings(),
          getTodayBookingsPerLocation(),
        ])

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
        } else if (!statsResult.success) {
          setError(statsResult.error || 'Failed to load stats')
        }

        if (bookingsResult.success && bookingsResult.data) {
          setRecentBookings(bookingsResult.data)
        }

        if (todayResult.success && todayResult.data) {
          setTodayBookings(todayResult.data)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const todayDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-rose-600">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Pending Bookings',
      value: stats.pendingBookings.toString(),
      icon: CalendarClock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      label: 'Active Buildings',
      value: stats.activeBuildings.toString(),
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Total Rooms',
      value: stats.totalRooms.toString(),
      icon: DoorOpen,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      label: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      helperText: stats.occupancyWindowLabel === 'NEXT_WEEK' ? 'Next week' : 'This week',
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overview of your booking system performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [...Array(4)].map((_, i) => (
              <Card key={i} className="h-28 animate-pulse">
                <div className="h-full w-full bg-slate-200 rounded" />
              </Card>
            ))
          : statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                      {'helperText' in stat && (
                        <p className="text-xs text-slate-500 mt-1">{stat.helperText}</p>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </Card>
              )
            })}
      </div>

      {/* Today's Bookings Per Location */}
      <Card>
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Today's Bookings</h3>
          <p className="text-sm text-slate-500">{todayDateLabel}</p>
        </div>

        {loading ? (
          <div className="p-6 animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-28 rounded-xl">
                <div className="h-full w-full bg-slate-200 rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {todayBookings.map((location) => (
              <div
                key={location.location}
                className="rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-4 text-center hover:shadow-lg transition"
              >
                <div className="text-sm font-medium text-indigo-600">{location.location}</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{location.total}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {location.total === 1 ? 'Booking Today' : 'Bookings Today'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Bookings */}
      <Card noPadding>
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
          <button
            type="button"
            onClick={onViewAllBookings}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-200 rounded" />
              ))}
            </div>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500">No recent bookings found.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                  {recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {booking.bookingReference}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{booking.submittedByName || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600">{booking.submittedByCompany || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{booking.roomName}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(booking.date)}</td>
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

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {booking.bookingReference}
                      </div>
                      <div className="text-sm text-slate-600">{booking.submittedByName || 'N/A'}</div>
                      {booking.submittedByCompany && (
                        <div className="text-xs text-slate-500">{booking.submittedByCompany}</div>
                      )}
                    </div>
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
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{booking.roomName}</span>
                    <span>{formatDate(booking.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
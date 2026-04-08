'use client'

import React, { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { 
  Users, 
  Building2, 
  DoorOpen, 
  CalendarClock, 
  TrendingUp, 
  BarChart3, 
  ArrowRight 
} from 'lucide-react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
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

  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [periodAnalytics, setPeriodAnalytics] = useState<DashboardAnalyticsPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [statsRes, recentRes] = await Promise.all([
          getDashboardStats(),
          getRecentBookings(),
        ])

        if (statsRes?.success && statsRes.data) setStats(statsRes.data)
        if (recentRes?.success && recentRes.data) setRecentBookings(recentRes.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const analyticsRes = await getBookingAnalytics(period)
        if (analyticsRes?.success && analyticsRes.data) {
          setPeriodAnalytics(analyticsRes.data)
        } else {
          setPeriodAnalytics([])
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
        setPeriodAnalytics([])
      }
    }

    fetchAnalytics()
  }, [period])

  const todayDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const chartData = periodAnalytics
  const totalPeriodBookings = chartData.reduce((sum, d) => sum + d.bookings, 0)
  const avgOccupancy = chartData.length > 0
    ? Math.round(chartData.reduce((sum, d) => sum + d.occupancy, 0) / chartData.length)
    : 0
  const bestPerformer = chartData.length > 0
    ? chartData.reduce((prev, current) => (prev.bookings > current.bookings ? prev : current))
    : { name: 'None' }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 pb-12">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor enterprise booking metrics, facility utilization, and recent requests.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
          <CalendarClock className="w-4 h-4 text-slate-400 mr-2.5" />
          <span className="text-sm font-medium text-slate-700">{todayDateLabel}</span>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Reschedules</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.pendingBookings}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg ring-1 ring-amber-100/50">
              <CalendarClock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Total Branches</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.activeBuildings}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg ring-1 ring-blue-100/50">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Total Rooms</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.totalRooms}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-lg ring-1 ring-indigo-100/50">
              <DoorOpen className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Weekly Room Occupancy</p>
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.occupancyRate}%</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg ring-1 ring-emerald-100/50">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* ANALYTICS SECTION */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden" noPadding>
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Utilization Analytics</h3>
          </div>
          <div className="flex p-0.5 space-x-1 bg-slate-200/50 rounded-md border border-slate-200/50">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all duration-200 ${
                  period === p
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 flex flex-col justify-center space-y-6 lg:pr-8 lg:border-r border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Period Bookings</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{totalPeriodBookings}</span>
                <span className="text-xs font-medium text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded">
                  <TrendingUp className="w-3 h-3 mr-1" /> Volume
                </span>
              </div>
            </div>
            <div className="h-px w-full bg-slate-100" />
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Average Occupancy</p>
              <p className="text-2xl font-bold text-slate-900">{avgOccupancy}%</p>
            </div>
            <div className="h-px w-full bg-slate-100" />
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Highest Performing Asset</p>
              <p className="text-lg font-semibold text-slate-800 truncate">{bestPerformer.name}</p>
            </div>
          </div>

          <div className="lg:col-span-3 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  name="Total Bookings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* RECENT BOOKINGS TABLE */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden" noPadding>
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-base font-semibold text-slate-900">Recent Transactions</h3>
          <button
            onClick={onViewAllBookings}
            className="group flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View Complete Log
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between w-full p-4 border border-slate-100 rounded-lg">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
                <div className="h-4 bg-slate-200 rounded animate-pulse w-32" />
                <div className="h-4 bg-slate-200 rounded animate-pulse w-20" />
                <div className="h-6 bg-slate-200 rounded-full animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 ring-1 ring-slate-100">
              <CalendarClock className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-medium text-base">No activity found</h4>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Recent booking transactions and requests will appear here once processed by the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-slate-500 uppercase tracking-wider text-xs">Reference ID</th>
                  <th className="px-6 py-4 text-left font-medium text-slate-500 uppercase tracking-wider text-xs">Client Name</th>
                  <th className="px-6 py-4 text-left font-medium text-slate-500 uppercase tracking-wider text-xs">Organization</th>
                  <th className="px-6 py-4 text-left font-medium text-slate-500 uppercase tracking-wider text-xs">Facility</th>
                  <th className="px-6 py-4 text-left font-medium text-slate-500 uppercase tracking-wider text-xs">Timestamp</th>
                  <th className="px-6 py-4 text-right font-medium text-slate-500 uppercase tracking-wider text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded-md text-xs tracking-wide">
                        {booking.bookingReference}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {booking.submittedByName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {booking.submittedByCompany || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {booking.roomName}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(booking.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge
                        variant={
                          booking.approvalStatus === 'CONFIRMED'
                            ? 'success'
                            : booking.approvalStatus === 'RESCHEDULED'
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
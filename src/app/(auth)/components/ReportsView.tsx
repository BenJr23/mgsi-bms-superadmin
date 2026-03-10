'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Download, TrendingUp, Clock, Users, Percent } from 'lucide-react'
import { getReportsData, type ReportsData, type ReportsDatePreset } from '@/app/_actions/reports'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ROOM_USAGE_BAR_COLORS = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']

export function ReportsView() {
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [preset, setPreset] = useState<ReportsDatePreset>('THIS_MONTH')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')

  useEffect(() => {
    async function fetchReportsData() {
      try {
        setLoading(true)
        setError(null)

        const result = await getReportsData({
          preset,
          startDate: preset === 'CUSTOM' ? (customStart || null) : null,
          endDate: preset === 'CUSTOM' ? (customEnd || null) : null,
        })
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to load reports data.')
        }

        setReportsData(result.data)
      } catch (err) {
        console.error('Error fetching reports data:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    fetchReportsData()
  }, [preset, customStart, customEnd])

  const maxTrendCount = useMemo(() => {
    if (!reportsData?.bookingTrend?.length) {
      return 0
    }

    return Math.max(...reportsData.bookingTrend.map((item) => item.count))
  }, [reportsData])

  const selectedRangeLabel = useMemo(() => {
    if (preset === 'TODAY') return 'Today'
    if (preset === 'THIS_WEEK') return 'This Week'
    if (preset === 'THIS_MONTH') return 'This Month'
    if (preset === 'THIS_YEAR') return 'This Year'
    if (preset === 'CUSTOM') {
      if (customStart && customEnd) return `${customStart} to ${customEnd}`
      return 'Custom Range'
    }
    return 'This Month'
  }, [preset, customStart, customEnd])

  const handleExportPDF = () => {
    if (!reportsData) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    const logo = new Image()
    logo.src = '/images/gwlogo.png'

    // Header
    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text('GreatWork - Admin Reports', margin, 20)

    // Logo (best-effort)
    try {
      doc.addImage(logo, 'PNG', pageWidth - margin - 36, 10, 36, 18)
    } catch {
      // ignore
    }

    // Date
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      margin,
      28
    )

    doc.text(`Range: ${selectedRangeLabel}`, margin, 34)

    // Summary Section
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Summary', margin, 44)

    const summaryData = [
      ['Total Bookings', reportsData.summary.totalBookings.toLocaleString()],
      ['Walk-in Bookings', reportsData.summary.walkInBookings.toLocaleString()],
      ['Approval Rate', `${reportsData.summary.approvalRate}%`],
    ]

    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    })

    const finalY1 = (doc as any).lastAutoTable.finalY || 48
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Booking Trend', margin, finalY1 + 14)

    const trendData = (reportsData.bookingTrend ?? []).map((item) => [item.monthLabel, item.count.toString()])
    autoTable(doc, {
      startY: finalY1 + 18,
      head: [['Period', 'Bookings']],
      body: trendData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'center' },
      },
    })

    const finalY2 = (doc as any).lastAutoTable.finalY || finalY1 + 18
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Top Rooms', margin, finalY2 + 14)

    const roomData = (reportsData.topRooms ?? []).map((item) => [
      item.roomName,
      item.buildingName,
      item.bookingCount.toString(),
    ])

    autoTable(doc, {
      startY: finalY2 + 18,
      head: [['Room', 'Building', 'Bookings']],
      body: roomData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    })

    // Footer
    const pageCount = doc.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }

    doc.save(`My GreatWork-Reports-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const summary = reportsData?.summary
  const sourceDistribution = reportsData?.bookingSourceDistribution ?? []

  const totalSourceCount = useMemo(() => {
    return sourceDistribution.reduce((sum, item) => sum + item.count, 0)
  }, [sourceDistribution])

  const sourceLegend = {
    WALK_IN: { label: 'Walk-in', color: 'bg-indigo-500' },
    ONLINE: { label: 'Online', color: 'bg-sky-500' },
  } as const

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Analytics and system usage insights.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleExportPDF}
            disabled={loading || !reportsData}
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Date Filter</h2>
            <p className="text-xs text-slate-500">Applies to all KPIs and charts.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'TODAY', label: 'Today' },
                { key: 'THIS_WEEK', label: 'This Week' },
                { key: 'THIS_MONTH', label: 'This Month' },
                { key: 'THIS_YEAR', label: 'This Year' },
                { key: 'CUSTOM', label: 'Custom' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPreset(item.key)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    preset === item.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {preset === 'CUSTOM' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Total Bookings</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {loading ? '—' : (summary?.totalBookings ?? 0).toLocaleString()}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{selectedRangeLabel}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-sky-100 rounded-lg text-sky-600">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Walk-in Bookings</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {loading ? '—' : (summary?.walkInBookings ?? 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-slate-100 rounded-lg text-slate-700">
              <Percent className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Approval Rate</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {loading ? '—' : `${summary?.approvalRate ?? 0}%`}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Walk-in vs Online</h3>
          {loading ? (
            <div className="h-44 animate-pulse bg-slate-100 rounded" />
          ) : totalSourceCount === 0 ? (
            <p className="text-sm text-slate-500">No data for this range.</p>
          ) : (
            <div className="space-y-3">
              {sourceDistribution.map((item) => {
                const meta = sourceLegend[item.source]
                const pct = totalSourceCount > 0 ? Math.round((item.count / totalSourceCount) * 100) : 0
                return (
                  <div key={item.source}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
                        {meta.label}
                      </span>
                      <span className="text-slate-900 font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className={`${meta.color} h-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Booking Trend</h3>
          {loading ? (
            <div className="h-48 sm:h-56 animate-pulse bg-slate-100 rounded" />
          ) : (reportsData?.bookingTrend?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No trend data available.</p>
          ) : (
            <>
              <div className="h-48 sm:h-56 flex items-end justify-between gap-1 px-1">
                {(reportsData?.bookingTrend ?? []).map((item, i) => {
                  const heightPercent =
                    maxTrendCount > 0
                      ? Math.max(Math.round((item.count / maxTrendCount) * 100), item.count > 0 ? 6 : 0)
                      : 0

                  return (
                    <div
                      key={`${item.monthLabel}-${i}`}
                      className="w-full bg-indigo-100 rounded-t-sm relative group hover:bg-indigo-200 transition-colors"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.monthLabel}: {item.count}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-[10px] sm:text-xs text-slate-400">
                {preset === 'THIS_YEAR' ? 'Months (Jan–Dec)' : 'Days (YYYY-MM-DD)'}
              </div>
            </>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Most Used Rooms</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded mb-2" />
                  <div className="h-2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : (reportsData?.topRooms?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No room usage data available.</p>
          ) : (
            <div className="space-y-3">
              {(reportsData?.topRooms ?? []).map((item, index) => {
                const max = (reportsData?.topRooms?.[0]?.bookingCount ?? 0) || 1
                const pct = Math.round((item.bookingCount / max) * 100)
                return (
                  <div key={item.roomId}>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-slate-700 truncate mr-2">{item.roomName} <span className="text-slate-400">({item.buildingName})</span></span>
                      <span className="font-medium text-slate-900 flex-shrink-0">{item.bookingCount}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ROOM_USAGE_BAR_COLORS[index % ROOM_USAGE_BAR_COLORS.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Most Used Buildings</h3>
        {loading ? (
          <div className="h-32 animate-pulse bg-slate-100 rounded" />
        ) : (reportsData?.topBuildings?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No building usage data available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(reportsData?.topBuildings ?? []).map((b) => (
              <div key={b.buildingId} className="rounded-lg border border-slate-200 p-4 bg-white">
                <div className="text-sm font-semibold text-slate-900 truncate" title={b.buildingName}>{b.buildingName}</div>
                <div className="text-xs text-slate-500 mt-1">Bookings</div>
                <div className="text-lg font-bold text-slate-900 mt-1">{b.bookingCount}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Download, TrendingUp, Clock } from 'lucide-react'
import { getReportsData, type ReportsData } from '@/app/_actions/reports'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ROOM_USAGE_BAR_COLORS = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']

export function ReportsView() {
  const [reportsData, setReportsData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReportsData() {
      try {
        setLoading(true)
        setError(null)

        const result = await getReportsData()
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
  }, [])

  const maxMonthlyCount = useMemo(() => {
    if (!reportsData?.monthlyBookingVolume?.length) {
      return 0
    }

    return Math.max(...reportsData.monthlyBookingVolume.map((item) => item.count))
  }, [reportsData])

  const handleExportPDF = () => {
    if (!reportsData) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    // Header
    doc.setFontSize(20)
    doc.setTextColor(128, 0, 0) // Maroon text
    doc.text('My GreatWork Spaces - Reports', margin, 20)

    // Date
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, margin, 28)

    // Summary Section
    doc.setFontSize(14)
    doc.setTextColor(128, 0, 0) // Maroon text
    doc.text('Summary', margin, 40)

    const summaryData = [
      ['Total Bookings', reportsData.summary.totalBookings.toLocaleString()],
      ['Total Bookings Change', `${reportsData.summary.totalBookingsChange >= 0 ? '+' : ''}${reportsData.summary.totalBookingsChange}%`],
      ['Average Duration', `${reportsData.summary.averageDurationHours} hours`],
      ['Average Duration Change', `${reportsData.summary.averageDurationChange >= 0 ? '+' : ''}${reportsData.summary.averageDurationChange}%`],
    ]

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [128, 0, 0] }, // Maroon table header
      margin: { left: margin, right: margin },
    })

    // Monthly Booking Volume
    const finalY1 = (doc as any).lastAutoTable.finalY || 45
    doc.setFontSize(14)
    doc.setTextColor(128, 0, 0)
    doc.text('Monthly Booking Volume', margin, finalY1 + 15)

    const monthlyData = reportsData.monthlyBookingVolume.map((item) => [
      item.monthLabel,
      item.count.toString(),
    ])

    autoTable(doc, {
      startY: finalY1 + 20,
      head: [['Month', 'Bookings']],
      body: monthlyData,
      theme: 'grid',
      headStyles: { fillColor: [128, 0, 0] }, // Maroon table header
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'center' },
      },
    })

    // Room Usage Distribution
    const finalY2 = (doc as any).lastAutoTable.finalY || finalY1 + 20

    // Header for Room Usage
    const setupRoomUsageHeader = (yPos: number) => {
      doc.setFontSize(14)
      doc.setTextColor(128, 0, 0)
      doc.text('Room Usage Distribution', margin, yPos)
    }

    const roomData = reportsData.roomUsageDistribution.map((item) => [
      item.roomName,
      item.buildingName,
      item.bookingCount.toString(),
      `${item.usagePercent}%`,
    ])

    if (finalY2 + 40 > doc.internal.pageSize.getHeight()) {
      doc.addPage()
      setupRoomUsageHeader(20)
      autoTable(doc, {
        startY: 25,
        head: [['Room Name', 'Building', 'Bookings', 'Usage %']],
        body: roomData,
        theme: 'grid',
        headStyles: { fillColor: [128, 0, 0] }, // Maroon table header
        margin: { left: margin, right: margin },
      })
    } else {
      setupRoomUsageHeader(finalY2 + 15)
      autoTable(doc, {
        startY: finalY2 + 20,
        head: [['Room Name', 'Building', 'Bookings', 'Usage %']],
        body: roomData,
        theme: 'grid',
        headStyles: { fillColor: [128, 0, 0] }, // Maroon table header
        margin: { left: margin, right: margin },
      })
    }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Analytics and system usage insights.</p>
        </div>
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

      {error && (
        <Card>
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Total Bookings</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {loading ? '—' : (summary?.totalBookings ?? 0).toLocaleString()}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {loading
              ? 'Loading…'
              : `${(summary?.totalBookingsChange ?? 0) >= 0 ? '+' : ''}${summary?.totalBookingsChange ?? 0}% from last month`}
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Avg. Duration</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                {loading ? '—' : `${summary?.averageDurationHours ?? 0} hrs`}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {loading
              ? 'Loading…'
              : `${(summary?.averageDurationChange ?? 0) >= 0 ? '+' : ''}${summary?.averageDurationChange ?? 0}% from last month`}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 sm:mb-6 text-sm sm:text-base">
            Booking Volume by Month
          </h3>

          {loading ? (
            <div className="h-48 sm:h-56 lg:h-64 animate-pulse bg-slate-100 rounded" />
          ) : (
            <>
              <div className="h-48 sm:h-56 lg:h-64 flex items-end justify-between gap-1 sm:gap-2 px-1 sm:px-2">
                {(reportsData?.monthlyBookingVolume ?? []).map((item, i) => {
                  const heightPercent =
                    maxMonthlyCount > 0
                      ? Math.max(Math.round((item.count / maxMonthlyCount) * 100), item.count > 0 ? 6 : 0)
                      : 0

                  return (
                    <div
                      key={`${item.monthLabel}-${i}`}
                      className="w-full bg-indigo-100 rounded-t-sm relative group hover:bg-indigo-200 transition-colors"
                      style={{
                        height: `${heightPercent}%`,
                      }}
                    >
                      <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.monthLabel}: {item.count}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-12 mt-3 sm:mt-4 text-[10px] sm:text-xs text-slate-400 uppercase">
                {(reportsData?.monthlyBookingVolume ?? []).map((item, i) => (
                  <span key={`${item.monthLabel}-label-${i}`} className="text-center">
                    {item.monthLabel.charAt(0)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-4 sm:mb-6 text-sm sm:text-base">
            Room Usage Distribution
          </h3>
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded mb-2" />
                  <div className="h-2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : (reportsData?.roomUsageDistribution?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No room usage data available.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {(reportsData?.roomUsageDistribution ?? []).map((item, index) => (
                <div key={item.roomId}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-slate-600 truncate mr-2">{item.roomName}</span>
                    <span className="font-medium text-slate-900 flex-shrink-0">{item.usagePercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${ROOM_USAGE_BAR_COLORS[index % ROOM_USAGE_BAR_COLORS.length]}`}
                      style={{
                        width: `${item.usagePercent}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
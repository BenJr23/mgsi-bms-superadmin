'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ApproveBookingModal } from '../Modals/ApproveBookingModal'
import { RejectBookingModal } from '../Modals/RejectBookingModal'
import { ViewBookingModal } from '../Modals/ViewBookingModal'
import { WalkInBookingModal } from '../Modals/WalkInBookingModal'
import { BookingsViewHeader } from './BookingsViewHeader'
import { BookingsViewFiltersBar } from './BookingsViewFiltersBar'
import { BookingsTable } from './BookingsTable'
import { BookingsPagination } from './BookingsPagination'
import { getBookingsCached, type BookingRow } from '@/app/_actions/bookings'
import { updateBookingApprovalStatus } from '@/app/_actions/bookings'
import { getCurrentUserForExport } from '@/app/_actions/auth'

export function BookingsClient() {
  const PAGE_SIZE = 10

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [activeBooking, setActiveBooking] = useState<BookingRow | null>(null)
  const [modalType, setModalType] = useState<'NONE' | 'VIEW' | 'APPROVE' | 'REJECT' | 'WALK_IN'>('NONE')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [companyFilter, setCompanyFilter] = useState('ALL')
  const [buildingFilter, setBuildingFilter] = useState('ALL')
  const [roomFilter, setRoomFilter] = useState('ALL')
  const [showFilters, setShowFilters] = useState(false)
  const [monthFilter, setMonthFilter] = useState<'ALL' | string>('ALL')
  const [exportUser, setExportUser] = useState<{ name: string | null; email: string } | null>(null)

  const closeModal = useCallback(() => {
    setModalType('NONE')
    setActiveBooking(null)
  }, [])

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true)
        const result = await getBookingsCached({ page: currentPage, pageSize: PAGE_SIZE })
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch bookings')
        }
        setBookings((result.data as BookingRow[]) || [])
        setTotalPages(result.totalPages || 1)
        setTotalCount(result.totalCount || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [currentPage])

  useEffect(() => {
    const fetchExportUser = async () => {
      try {
        const result = await getCurrentUserForExport()
        if (result.success) {
          setExportUser({ name: result.data.name, email: result.data.email })
        }
      } catch {
        // ignore
      }
    }

    fetchExportUser()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const availableCompanies = useMemo(() => {
    const companies = new Set<string>()
    bookings.forEach((booking) => {
      const companyName = booking.submittedBy.companyName?.trim()
      if (companyName) companies.add(companyName)
    })
    return Array.from(companies).sort((a, b) => a.localeCompare(b))
  }, [bookings])

  const availableBuildings = useMemo(() => {
    const buildingNames = new Set<string>()
    bookings.forEach((booking) => {
      const buildingName = booking.building.name?.trim()
      if (buildingName) buildingNames.add(buildingName)
    })
    return Array.from(buildingNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: name, name }))
  }, [bookings])

  const availableRooms = useMemo(() => {
    const roomNames = new Set<string>()
    bookings
      .filter((booking) => buildingFilter === 'ALL' || booking.building.name === buildingFilter)
      .forEach((booking) => {
        const roomName = booking.room.name?.trim()
        if (roomName) roomNames.add(roomName)
      })

    return Array.from(roomNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: name, name }))
  }, [bookings, buildingFilter])

  const filteredBookings = useMemo(() => {
    const q = debouncedQuery.toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.approvalStatus !== statusFilter) return false
      if (companyFilter !== 'ALL' && (b.submittedBy.companyName || '') !== companyFilter) return false
      if (buildingFilter !== 'ALL' && b.building.name !== buildingFilter) return false
      if (roomFilter !== 'ALL' && b.room.name !== roomFilter) return false
      if (!q) return true
      return (
        b.bookingReference.toLowerCase().includes(q) ||
        (b.submittedBy.name || '').toLowerCase().includes(q) ||
        b.submittedBy.email.toLowerCase().includes(q) ||
        b.room.name.toLowerCase().includes(q) ||
        b.building.name.toLowerCase().includes(q)
      )
    })
  }, [bookings, debouncedQuery, statusFilter, companyFilter, buildingFilter, roomFilter])

  const handleAction = useCallback(
    async (status: 'APPROVED' | 'REJECTED', message?: string) => {
      if (!activeBooking) {
        return { success: false, error: 'No active booking selected.' }
      }

      try {
        const result = await updateBookingApprovalStatus(activeBooking.id, status, message)

        if (result.success) {
          setBookings((prev) =>
            prev.map((b) =>
              b.id === activeBooking.id
                ? {
                    ...b,
                    approvalStatus: status,
                    message: status === 'REJECTED' ? (message?.trim() || null) : b.message,
                  }
                : b
            )
          )
          setError(null)
        }

        return {
          success: result.success,
          error: result.error,
        }
      } catch (err) {
        console.error('Action failed', err)
        return { success: false, error: 'A network error occurred.' }
      }
    },
    [activeBooking]
  )

  const escapeCSV = (val: string) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const getMonthParts = (value: 'ALL' | string): { year: number; month: number } | null => {
    if (!value || value === 'ALL') return null
    const v = value.trim()

    if (/^\d{4}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-')
      const year = Number(y)
      const month = Number(m)
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
      return { year, month }
    }

    if (/^\d{2}$/.test(v)) {
      const month = Number(v)
      if (!Number.isFinite(month) || month < 1 || month > 12) return null
      return { year: new Date().getFullYear(), month }
    }

    return null
  }

  const exportCSV = useCallback(
    (items: BookingRow[], month: 'ALL' | string = 'ALL') => {
      const headers = ['Reference', 'Client', 'Company', 'Building', 'Room', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Status']
      const monthParts = getMonthParts(month)
      const filtered = !monthParts
        ? items
        : items.filter((b) => {
            const y = b._display.startYear
            const m = b._display.startMonth
            if (!y || !m) return false
            return y === monthParts.year && m === monthParts.month
          })

      const rows = filtered.map((b) => [
        escapeCSV(b.bookingReference),
        escapeCSV(b.submittedBy.name || b.submittedBy.email),
        escapeCSV(b.submittedBy.companyName || '-'),
        escapeCSV(b.building.name),
        escapeCSV(b.room.name),
        escapeCSV(b._display.startDateForExport),
        escapeCSV(b._display.startTimeForExport),
        escapeCSV(b._display.endDateForExport),
        escapeCSV(b._display.endTimeForExport),
        escapeCSV(b.approvalStatus),
      ])

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const monthSuffix = month === 'ALL' ? new Date().toISOString().slice(0, 10) : month
      const a = document.createElement('a')
      a.href = url
      a.download = `bookings-${monthSuffix}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    []
  )

  const exportPDF = useCallback(
    (items: BookingRow[]) => {
      const exportedBy = exportUser?.name || exportUser?.email || 'Administrator'

      const exportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const monthParts = getMonthParts(monthFilter)

      const filteredItems = !monthParts
        ? items
        : items.filter((b) => {
            const y = b._display.startYear
            const m = b._display.startMonth
            if (!y || !m) return false
            return y === monthParts.year && m === monthParts.month
          })

      const getMonthDisplay = () => {
        if (!monthParts) return 'All Months'
        const date = new Date(monthParts.year, monthParts.month - 1, 1)
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }

      const win = window.open('', '_blank')
      if (!win) return

      const beforeTable = `
      <html>
        <head>
          <title>Bookings Report</title>
          <style>
            body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial; color:#111827; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
            .logo-container { display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 15px; }
            .logo { max-width: 120px; max-height: 60px; }
            .title { font-size: 24px; font-weight: bold; color: #111827; margin: 0; }
            .subtitle { font-size: 14px; color: #6b7280; margin: 5px 0 0 0; }
            .month-info { font-size: 16px; color: #374151; margin: 10px 0 0 0; font-weight: 600; }
            .export-info { text-align: right; font-size: 12px; color: #6b7280; margin-bottom: 20px; }
            table { border-collapse: collapse; width:100%; margin-top: 20px; }
            th { text-align:left; padding:8px; border:1px solid #e6edf3; background:#f8fafc; font-weight: 600; }
            td { padding:8px; border:1px solid #e6edf3; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="/images/gwlogo.png" alt="GreatWork Logo" class="logo" />
            </div>
            <h1 class="title">Bookings Report</h1>
            <p class="subtitle">GreatWork Booking Management System</p>
            <p class="month-info">Bookings for: ${getMonthDisplay()}</p>
          </div>

          <div class="export-info">
            <strong>Exported by:</strong> ${exportedBy}<br>
            <strong>Export Date:</strong> ${exportDate}<br>
            <strong>Total Records:</strong> ${filteredItems.length}
          </div>

          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Company</th>
                <th>Building</th>
                <th>Room</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `

      const afterTable = `
            </tbody>
          </table>

          <div class="footer">
            <p> ${new Date().getFullYear()} GreatWork. All rights reserved.</p>
            <p>This report was generated from the GreatWork Booking Management System.</p>
          </div>
        </body>
      </html>
    `

      const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

      const writeRowsChunked = async () => {
        win.document.open()
        win.document.write(beforeTable)

        const chunkSize = 200
        for (let i = 0; i < filteredItems.length; i += chunkSize) {
          const chunk = filteredItems.slice(i, i + chunkSize)
          const rows = chunk
            .map(
              (b) => `
            <tr>
              <td style="padding:8px;border:1px solid #e6edf3">${b.bookingReference}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b.submittedBy.name || b.submittedBy.email}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b.submittedBy.companyName || '-'}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b.building.name}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b.room.name}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b._display.startDateForExport} ${b._display.startTimeForExport}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b._display.endDateForExport} ${b._display.endTimeForExport}</td>
              <td style="padding:8px;border:1px solid #e6edf3">${b.approvalStatus}</td>
            </tr>
          `
            )
            .join('\n')

          win.document.write(rows)
          await yieldToBrowser()
        }

        win.document.write(afterTable)
        win.document.close()

        setTimeout(() => {
          win.focus()
          win.print()
        }, 500)
      }

      void writeRowsChunked()
    },
    [exportUser, monthFilter]
  )

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-slate-500">Loading bookings...</p>
      </div>
    )

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <BookingsViewHeader
        monthFilter={monthFilter}
        onMonthFilterChange={(value) => setMonthFilter(value)}
        onExportCSV={() => exportCSV(filteredBookings, monthFilter)}
        onExportPDF={() => exportPDF(filteredBookings)}
        onOpenWalkIn={() => setModalType('WALK_IN')}
      />

      <div className="rounded-xl border border-slate-200 bg-white">
        <BookingsViewFiltersBar
          query={query}
          onQueryChange={(value) => setQuery(value)}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => setStatusFilter(value)}
          companyFilter={companyFilter}
          buildingFilter={buildingFilter}
          roomFilter={roomFilter}
          availableCompanies={availableCompanies}
          availableBuildings={availableBuildings}
          availableRooms={availableRooms}
          onCompanyFilterChange={(value) => setCompanyFilter(value)}
          onBuildingFilterChange={(value) => {
            setBuildingFilter(value)
            setRoomFilter('ALL')
          }}
          onRoomFilterChange={(value) => setRoomFilter(value)}
          onClearFilters={() => {
            setStatusFilter('ALL')
            setCompanyFilter('ALL')
            setBuildingFilter('ALL')
            setRoomFilter('ALL')
            setQuery('')
          }}
          onCloseFilters={() => setShowFilters(false)}
        />

        <BookingsTable
          bookings={filteredBookings}
          onView={(booking) => {
            setActiveBooking(booking)
            setModalType('VIEW')
          }}
          onApprove={(booking) => {
            setActiveBooking(booking)
            setModalType('APPROVE')
          }}
          onReject={(booking) => {
            setActiveBooking(booking)
            setModalType('REJECT')
          }}
        />

        <BookingsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          loading={loading}
          onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      {activeBooking && (
        <>
          <ViewBookingModal
            isOpen={modalType === 'VIEW'}
            onClose={closeModal}
            details={{
              bookingReference: activeBooking.bookingReference,
              submittedByName: activeBooking.submittedBy.name || activeBooking.submittedBy.email,
              submittedByEmail: activeBooking.submittedBy.email,
              clientCompany: activeBooking.submittedBy.companyName || null,
              buildingName: activeBooking.building.name,
              roomName: activeBooking.room.name,
              bookingType: activeBooking.bookingType,
              clientStatus: activeBooking.clientStatus,
              approvalStatus: activeBooking.approvalStatus,
              dateRange: activeBooking._display.dateRange || activeBooking.startDate,
              timeRange: activeBooking._display.timeRange || '-',
              submittedAt: activeBooking._display.submittedAt || '-',
              approvalDate: activeBooking._display.approvalDate || '-',
              cancellationDeadline: activeBooking._display.cancellationDeadline || '-',
              attendeeCount: activeBooking.attendeeCount,
              message: activeBooking.message,
              updatedByName: activeBooking.updatedBy?.name || null,
            }}
          />
          <ApproveBookingModal
            isOpen={modalType === 'APPROVE'}
            onClose={closeModal}
            bookingRef={activeBooking.bookingReference}
            clientName={activeBooking.submittedBy.name || activeBooking.submittedBy.email}
            onConfirm={() => handleAction('APPROVED')}
          />
          <RejectBookingModal
            isOpen={modalType === 'REJECT'}
            onClose={closeModal}
            bookingRef={activeBooking.bookingReference}
            clientName={activeBooking.submittedBy.name || activeBooking.submittedBy.email}
            onConfirm={(message) => handleAction('REJECTED', message)}
          />
        </>
      )}

      <WalkInBookingModal
        isOpen={modalType === 'WALK_IN'}
        onClose={() => setModalType('NONE')}
        onSuccess={() => {
          setModalType('NONE')
          const fetchBookings = async () => {
            try {
              setLoading(true)
              const result = await getBookingsCached({ page: currentPage, pageSize: PAGE_SIZE })
              if (result.success) {
                setBookings((result.data as BookingRow[]) || [])
                setTotalPages(result.totalPages || 1)
                setTotalCount(result.totalCount || 0)
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
              setLoading(false)
            }
          }
          fetchBookings()
        }}
      />
    </div>
  )
}

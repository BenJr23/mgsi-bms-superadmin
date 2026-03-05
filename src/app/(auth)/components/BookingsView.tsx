'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { Loader2 } from 'lucide-react';
import { ApproveBookingModal } from './Modals/ApproveBookingModal';
import { RejectBookingModal } from './Modals/RejectBookingModal';
import { ViewBookingModal } from './Modals/ViewBookingModal';
import { WalkInBookingModal } from './Modals/WalkInBookingModal';
import { BookingsViewHeader } from './bookings/BookingsViewHeader'
import { BookingsViewFiltersBar } from './bookings/BookingsViewFiltersBar'
import { BookingsTable } from './bookings/BookingsTable'
import { BookingsPagination } from './bookings/BookingsPagination'

import {
  getBookingsCached,
  type BookingListItem,
  updateBookingApprovalStatus,
  getBuildings,
  getRoomsByBuilding,
} from '@/app/_actions/bookings';
import { getCurrentUserForExport } from '@/app/_actions/auth';

export function BookingsView() {

  const DISPLAY_TIMEZONE = 'Asia/Manila'; // UTC+8
  const PAGE_SIZE = 10;

  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeBooking, setActiveBooking] = useState<BookingListItem | null>(null);
  const [modalType, setModalType] = useState<'NONE' | 'VIEW' | 'APPROVE' | 'REJECT' | 'WALK_IN'>('NONE');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [monthFilter, setMonthFilter] = useState<'ALL' | string>('ALL');
  const [exportUser, setExportUser] = useState<{ name: string | null; email: string } | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableBuildings, setAvailableBuildings] = useState<{ id: string; name: string }[]>([]);
  const [availableRooms, setAvailableRooms] = useState<{ id: string; name: string }[]>([]);

  const toSafeDate = (value: string) => {
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return null
    return dt
  }

  const formatDate = (dt: Date) =>
    dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    })

  const formatTime = (dt: Date, timeZone: string) =>
    dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    })

  const formatDateTime = (dt: Date) =>
    dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    })

  const formatDateRange = (start: Date, end: Date) => {
    const startText = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    })

    const endText = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    })

    if (startText === endText) return startText

    const startYear = start.toLocaleDateString('en-US', { year: 'numeric', timeZone: DISPLAY_TIMEZONE })
    const endYear = end.toLocaleDateString('en-US', { year: 'numeric', timeZone: DISPLAY_TIMEZONE })
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: DISPLAY_TIMEZONE })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: DISPLAY_TIMEZONE })

    if (startYear === endYear && startMonth === endMonth) {
      const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: DISPLAY_TIMEZONE })
      const endDay = end.toLocaleDateString('en-US', { day: 'numeric', timeZone: DISPLAY_TIMEZONE })
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`
    }

    if (startYear === endYear) {
      const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: DISPLAY_TIMEZONE })
      return `${startMonth} ${startDay} - ${endText}`
    }

    return `${startText} - ${endText}`
  }

  type BookingRow = BookingListItem & {
    _display: {
      dateRange: string
      timeRange: string
      submittedAt: string
      approvalDate: string
      cancellationDeadline: string
      startDateForExport: string
      endDateForExport: string
      startTimeForExport: string
      endTimeForExport: string
      startYear: number | null
      startMonth: number | null
    }
  }

  const bookingRows: BookingRow[] = useMemo(() => {
    return bookings.map((b) => {
      const start = toSafeDate(b.startDate)
      const end = toSafeDate(b.endDate)
      const submittedAt = toSafeDate(b.submittedAt)
      const approvalDate = b.approvalDate ? toSafeDate(b.approvalDate) : null
      const cancellationDeadline = b.cancellationDeadline ? toSafeDate(b.cancellationDeadline) : null

      const startTimeBase = toSafeDate(b.dailyTimeStart || b.startDate)
      const endTimeBase = toSafeDate(b.dailyTimeEnd || b.endDate)
      const startTimeTz = b.dailyTimeStart ? 'UTC' : DISPLAY_TIMEZONE
      const endTimeTz = b.dailyTimeEnd ? 'UTC' : DISPLAY_TIMEZONE

      const startYear = start ? start.getFullYear() : null
      const startMonth = start ? start.getMonth() + 1 : null

      const dateRange = start && end ? formatDateRange(start, end) : (b.startDate || '-')
      const startTimeLabel = startTimeBase ? formatTime(startTimeBase, startTimeTz) : '--:--'
      const endTimeLabel = endTimeBase ? formatTime(endTimeBase, endTimeTz) : '--:--'

      return {
        ...b,
        _display: {
          dateRange,
          timeRange: `${startTimeLabel} - ${endTimeLabel}`,
          submittedAt: submittedAt ? formatDateTime(submittedAt) : '-',
          approvalDate: approvalDate ? formatDateTime(approvalDate) : '-',
          cancellationDeadline: cancellationDeadline ? formatDateTime(cancellationDeadline) : '-',
          startDateForExport: start ? formatDate(start) : b.startDate,
          endDateForExport: end ? formatDate(end) : b.endDate,
          startTimeForExport: startTimeBase ? formatTime(startTimeBase, startTimeTz) : '--:--',
          endTimeForExport: endTimeBase ? formatTime(endTimeBase, endTimeTz) : '--:--',
          startYear,
          startMonth,
        },
      }
    })
  }, [bookings])

  const closeModal = () => {
    setModalType('NONE');
    setActiveBooking(null);
  };

  const clearFilters = () => {
    setCompanyFilter('ALL');
    setBuildingFilter('ALL');
    setRoomFilter('ALL');
    setStatusFilter('ALL');
    setQuery('');
  };

  useEffect(() => {
    const fetchBookings = async () => {

      try {
        setLoading(true);
        const result = await getBookingsCached({ 
          page: currentPage, 
          pageSize: PAGE_SIZE,
          companyId: companyFilter !== 'ALL' ? companyFilter : undefined,
          buildingId: buildingFilter !== 'ALL' ? buildingFilter : undefined,
          roomId: roomFilter !== 'ALL' ? roomFilter : undefined
        });
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch bookings');
        }
        setBookings(result.data || []);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [currentPage, companyFilter, buildingFilter, roomFilter]);

  useEffect(() => {
    const fetchExportUser = async () => {
      try {
        const result = await getCurrentUserForExport();
        if (result.success) {
          setExportUser({ name: result.data.name, email: result.data.email });
        }
      } catch {
        // ignore
      }
    };

    fetchExportUser();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch buildings
        const buildingsResult = await getBuildings();
        if (buildingsResult.success) {
          setAvailableBuildings(buildingsResult.data?.map(b => ({ id: b.id, name: b.buildingName })) || []);
        }

        // Fetch companies from all bookings (without pagination to get unique values)
        const allBookingsResult = await getBookingsCached({ pageSize: 1000 }); // Get a large batch to get unique companies
        if (allBookingsResult.success && allBookingsResult.data) {
          const uniqueCompanies = Array.from(new Set(
            allBookingsResult.data
              .map(b => b.submittedBy.companyName)
              .filter((company): company is string => company != null)
          )).sort();
          setAvailableCompanies(uniqueCompanies);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      if (buildingFilter !== 'ALL') {
        try {
          const roomsResult = await getRoomsByBuilding({ buildingId: buildingFilter });
          if (roomsResult.success) {
            setAvailableRooms(roomsResult.data?.map(r => ({ id: r.id, name: r.roomName })) || []);
          }
        } catch (error) {
          console.error('Error fetching rooms:', error);
        }
      } else {
        setAvailableRooms([]);
      }
      // Reset room filter when building changes
      setRoomFilter('ALL');
    };

    fetchRooms();
  }, [buildingFilter]);

  useEffect(() => {
    // Reset to page 1 when filters change to avoid showing empty results
    setCurrentPage(1);
  }, [companyFilter, buildingFilter, roomFilter]);

  const filteredBookings = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return bookingRows.filter((b) => {
      if (statusFilter !== 'ALL' && b.approvalStatus !== statusFilter) return false;

      if (!q) return true;

      return (
        b.bookingReference.toLowerCase().includes(q) ||
        (b.submittedBy.name || '').toLowerCase().includes(q) ||
        b.submittedBy.email.toLowerCase().includes(q) ||
        b.room.name.toLowerCase().includes(q) ||
        b.building.name.toLowerCase().includes(q)
      );
    });
  }, [bookingRows, debouncedQuery, statusFilter]);

  const handleAction = async (status: 'APPROVED' | 'REJECTED', message?: string) => {
    if (!activeBooking) {
      return { success: false, error: 'No active booking selected.' };
    }
    
    try {
      const result = await updateBookingApprovalStatus(activeBooking.id, status, message);

      if (result.success) {
        setBookings(prev => prev.map(b => 
          b.id === activeBooking.id
            ? {
                ...b,
                approvalStatus: status,
                message: status === 'REJECTED' ? (message?.trim() || null) : b.message,
              }
            : b
        ));
        setError(null);
      }

      return {
        success: result.success,
        error: result.error,
      };
    } catch (err) {
      console.error("Action failed", err);
      return { success: false, error: 'A network error occurred.' };
    }
  };

  const escapeCSV = (val: string) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const getMonthParts = (value: 'ALL' | string): { year: number; month: number } | null => {
    if (!value || value === 'ALL') return null
    const v = value.trim()

    // Supports both formats:
    // - "YYYY-MM" from <input type="month">
    // - "MM" from older dropdown
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

  const exportCSV = (items: BookingRow[], month: 'ALL' | string = 'ALL') => {
    const headers = ['Reference','Client','Company','Building','Room','Start Date','Start Time','End Date','End Time','Status']
    const monthParts = getMonthParts(month)
    const filtered = !monthParts ? items : items.filter((b) => {
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

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const monthSuffix = month === 'ALL' ? new Date().toISOString().slice(0,10) : month
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${monthSuffix}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = (items: BookingRow[]) => {
    const exportedBy = exportUser?.name || exportUser?.email || 'Administrator';

    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const monthParts = getMonthParts(monthFilter)

    // Apply month filter to PDF export
    const filteredItems = !monthParts ? items : items.filter((b) => {
      const y = b._display.startYear
      const m = b._display.startMonth
      if (!y || !m) return false
      return y === monthParts.year && m === monthParts.month
    });

    // Get month display name
    const getMonthDisplay = () => {
      if (!monthParts) return 'All Months'
      const date = new Date(monthParts.year, monthParts.month - 1, 1)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };

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
          .map((b) => `
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
          `)
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
  }

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

      <Card noPadding>
        <BookingsViewFiltersBar
          query={query}
          onQueryChange={(value) => setQuery(value)}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => setStatusFilter(value)}
          onCloseFilters={() => setShowFilters(false)}
          companyFilter={companyFilter}
          buildingFilter={buildingFilter}
          roomFilter={roomFilter}
          availableCompanies={availableCompanies}
          availableBuildings={availableBuildings}
          availableRooms={availableRooms}
          onCompanyFilterChange={(value) => setCompanyFilter(value)}
          onBuildingFilterChange={(value) => setBuildingFilter(value)}
          onRoomFilterChange={(value) => setRoomFilter(value)}
          onClearFilters={clearFilters}
        />

        {loading && bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading bookings...</p>
          </div>
        ) : (
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
        )}

        <BookingsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          loading={loading}
          onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        />
      </Card>

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
              dateRange: (bookingRows.find((b) => b.id === activeBooking.id)?._display.dateRange) || activeBooking.startDate,
              timeRange: (bookingRows.find((b) => b.id === activeBooking.id)?._display.timeRange) || '-',
              submittedAt: (bookingRows.find((b) => b.id === activeBooking.id)?._display.submittedAt) || '-',
              approvalDate: (bookingRows.find((b) => b.id === activeBooking.id)?._display.approvalDate) || '-',
              cancellationDeadline: (bookingRows.find((b) => b.id === activeBooking.id)?._display.cancellationDeadline) || '-',
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
          setModalType('NONE');
          // Refresh bookings list
          const fetchBookings = async () => {
            try {
              setLoading(true);
              const result = await getBookingsCached({ page: currentPage, pageSize: PAGE_SIZE, companyId: companyFilter !== 'ALL' ? companyFilter : undefined, buildingId: buildingFilter !== 'ALL' ? buildingFilter : undefined, roomId: roomFilter !== 'ALL' ? roomFilter : undefined });
              if (result.success) {
                setBookings(result.data || []);
                setTotalPages(result.totalPages || 1);
                setTotalCount(result.totalCount || 0);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
              setLoading(false);
            }
          };
          fetchBookings();
        }}
      />
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Search, Filter, MoreHorizontal, Check, X, Loader2, Eye, Plus } from 'lucide-react';
import { ApproveBookingModal } from './Modals/ApproveBookingModal';
import { RejectBookingModal } from './Modals/RejectBookingModal';
import { ViewBookingModal } from './Modals/ViewBookingModal';
import { WalkInBookingModal } from './Modals/WalkInBookingModal';
import {
  getBookings,
  type BookingListItem,
  updateBookingApprovalStatus,
} from '@/app/_actions/bookings';

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

  const closeModal = () => {
    setModalType('NONE');
    setActiveBooking(null);
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const result = await getBookings({ page: currentPage, pageSize: PAGE_SIZE });
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
  }, [currentPage]);

  // debounce query input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filteredBookings = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return bookings.filter((b) => {
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
  }, [bookings, debouncedQuery, statusFilter]);

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

  const formatDate = (dateString: string) => {
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return dateString;
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const formatTime = (dateString: string) => {
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return '--:--';
    return dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '-';
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const formatWallClockTime = (dateString: string) => {
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return '--:--';

    return dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  };

  const formatDateRange = (startDateString: string, endDateString: string) => {
    const start = new Date(startDateString);
    const end = new Date(endDateString);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return formatDate(startDateString);
    }

    const startText = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    });

    const endText = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: DISPLAY_TIMEZONE,
    });

    if (startText === endText) return startText;

    const startYear = start.toLocaleDateString('en-US', { year: 'numeric', timeZone: DISPLAY_TIMEZONE });
    const endYear = end.toLocaleDateString('en-US', { year: 'numeric', timeZone: DISPLAY_TIMEZONE });
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: DISPLAY_TIMEZONE });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: DISPLAY_TIMEZONE });

    if (startYear === endYear && startMonth === endMonth) {
      const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: DISPLAY_TIMEZONE });
      const endDay = end.toLocaleDateString('en-US', { day: 'numeric', timeZone: DISPLAY_TIMEZONE });
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
    }

    if (startYear === endYear) {
      const startDay = start.toLocaleDateString('en-US', { day: 'numeric', timeZone: DISPLAY_TIMEZONE });
      return `${startMonth} ${startDay} - ${endText}`;
    }

    return `${startText} - ${endText}`;
  };

  const getDisplayStartTime = (booking: BookingListItem) =>
    booking.dailyTimeStart || booking.startDate;

  const getDisplayEndTime = (booking: BookingListItem) =>
    booking.dailyTimeEnd || booking.endDate;

  const formatBookingTime = (booking: BookingListItem, value: string, type: 'start' | 'end') => {
    const hasDailyTime = type === 'start' ? Boolean(booking.dailyTimeStart) : Boolean(booking.dailyTimeEnd);
    return hasDailyTime ? formatWallClockTime(value) : formatTime(value);
  };

  const escapeCSV = (val: string) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const exportCSV = (items: BookingListItem[], month: 'ALL' | string = 'ALL') => {
    const headers = ['Reference','Client','Company','Building','Room','Start Date','Start Time','End Date','End Time','Status']
    const filtered = month === 'ALL' ? items : items.filter((b) => {
      // month in format YYYY-MM
      try {
        const dt = new Date(b.startDate)
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        return `${y}-${m}` === month
      } catch {
        return false
      }
    })

    const rows = filtered.map((b) => [
      escapeCSV(b.bookingReference),
      escapeCSV(b.submittedBy.name || b.submittedBy.email),
      escapeCSV(b.submittedBy.companyName || '-'),
      escapeCSV(b.building.name),
      escapeCSV(b.room.name),
      escapeCSV(formatDate(b.startDate)),
      escapeCSV(formatBookingTime(b, getDisplayStartTime(b), 'start')),
      escapeCSV(formatDate(b.endDate)),
      escapeCSV(formatBookingTime(b, getDisplayEndTime(b), 'end')),
      escapeCSV(b.approvalStatus),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const monthSuffix = month === 'ALL' ? new Date().toISOString().slice(0,10) : month
    a.download = `bookings-${monthSuffix}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = (items: BookingListItem[]) => {
    // Create a print-friendly HTML and open in a new window. User can Save as PDF.
    const rows = items.map((b) => `
      <tr>
        <td style="padding:8px;border:1px solid #e6edf3">${b.bookingReference}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${b.submittedBy.name || b.submittedBy.email}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${b.submittedBy.companyName || '-'}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${b.building.name}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${b.room.name}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${formatDate(b.startDate)} ${formatBookingTime(b, getDisplayStartTime(b), 'start')}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${formatDate(b.endDate)} ${formatBookingTime(b, getDisplayEndTime(b), 'end')}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${b.approvalStatus}</td>
      </tr>
    `).join('\n')

    const html = `
      <html>
        <head>
          <title>Bookings</title>
          <style>
            body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial; color:#111827; }
            table { border-collapse: collapse; width:100%; }
            th { text-align:left; padding:8px; border:1px solid #e6edf3; background:#f8fafc }
          </style>
        </head>
        <body>
          <h2>Bookings</h2>
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
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    // wait for render then trigger print
    setTimeout(() => {
      win.focus()
      win.print()
    }, 500)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      <p className="text-slate-500">Loading bookings...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500">Manage and approve booking requests.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex items-center gap-3">
            <label className="text-sm text-slate-500">Month:</label>
            <input
              type="month"
              value={monthFilter === 'ALL' ? '' : monthFilter}
              onChange={(e) => setMonthFilter(e.target.value ? e.target.value : 'ALL')}
              className="border border-slate-300 rounded-md px-2 py-1 text-sm"
            />
            <Button
              variant="outline"
              onClick={() => exportCSV(filteredBookings, monthFilter)}
              title="Export CSV"
            >
              Export CSV
            </Button>
            <Button
              onClick={() => exportPDF(filteredBookings)}
              className="ml-2"
            >
              Export PDF
            </Button>
          </div>
          <Button onClick={() => setModalType('WALK_IN')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Walk-In Booking
          </Button>
        </div>
      </header>

      <Card noPadding>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search bookings..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="w-4 h-4" />Filter
            </Button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-md shadow-md z-10 p-2">
                <div className="text-sm text-slate-600 mb-2">Status</div>
                <ul className="space-y-1">
                  {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                    <li key={s}>
                      <button
                        onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                        className={`w-full text-left text-sm py-1 px-2 rounded ${statusFilter === s ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-[150px]">Reference</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 max-w-[150px]">
                    <span className="block truncate" title={booking.bookingReference}>
                      {booking.bookingReference}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="text-slate-900 font-medium">{booking.submittedBy.name || booking.submittedBy.email}</div>
                    {booking.submittedBy.companyName && (
                      <div className="text-xs text-slate-500">{booking.submittedBy.companyName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 font-medium">{booking.room.name}</div>
                    <div className="text-xs text-slate-500">{booking.building.name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 min-w-[240px]">
                    <div>{formatDateRange(booking.startDate, booking.endDate)}</div>
                    <div className="text-xs text-slate-400">
                      {formatBookingTime(booking, getDisplayStartTime(booking), 'start')} - {formatBookingTime(booking, getDisplayEndTime(booking), 'end')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={booking.approvalStatus === 'APPROVED' ? 'success' : booking.approvalStatus === 'PENDING' ? 'warning' : 'danger'}>
                      {booking.approvalStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {booking.approvalStatus === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setActiveBooking(booking); setModalType('VIEW'); }} className="p-1 hover:bg-sky-100 text-sky-600 rounded-full" title="View booking"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => { setActiveBooking(booking); setModalType('APPROVE'); }} className="p-1 hover:bg-emerald-100 text-emerald-600 rounded-full"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setActiveBooking(booking); setModalType('REJECT'); }} className="p-1 hover:bg-rose-100 text-rose-600 rounded-full"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setActiveBooking(booking); setModalType('VIEW'); }} className="p-1 hover:bg-sky-100 text-sky-600 rounded-full" title="View booking"><Eye className="w-4 h-4" /></button>
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing page {currentPage} of {totalPages} • {totalCount} total bookings
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
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
              dateRange: formatDateRange(activeBooking.startDate, activeBooking.endDate),
              timeRange: `${formatBookingTime(activeBooking, getDisplayStartTime(activeBooking), 'start')} - ${formatBookingTime(activeBooking, getDisplayEndTime(activeBooking), 'end')}`,
              submittedAt: formatDateTime(activeBooking.submittedAt),
              approvalDate: formatDateTime(activeBooking.approvalDate),
              cancellationDeadline: formatDateTime(activeBooking.cancellationDeadline),
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
              const result = await getBookings({ page: currentPage, pageSize: PAGE_SIZE });
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
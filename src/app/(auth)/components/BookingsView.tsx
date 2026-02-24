import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Search, Filter, MoreHorizontal, Check, X, Loader2 } from 'lucide-react';
import { ApproveBookingModal } from './Modals/ApproveBookingModal';
import { RejectBookingModal } from './Modals/RejectBookingModal';
import {
  getBookings,
  type BookingListItem,
  updateBookingApprovalStatus,
} from '@/app/_actions/bookings';

export function BookingsView() {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingListItem | null>(null);
  const [modalType, setModalType] = useState<'NONE' | 'APPROVE' | 'REJECT'>('NONE');
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
        const result = await getBookings();
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch bookings');
        }
        setBookings(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

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

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!activeBooking) {
      return { success: false, error: 'No active booking selected.' };
    }
    
    try {
      const result = await updateBookingApprovalStatus(activeBooking.id, status);

      if (result.success) {
        setBookings(prev => prev.map(b => 
          b.id === activeBooking.id ? { ...b, approvalStatus: status } : b
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

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (dateString: string) => 
    new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const escapeCSV = (val: string) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const exportCSV = (items: BookingListItem[], month: 'ALL' | string = 'ALL') => {
    const headers = ['Reference','Client','Building','Room','Start Date','Start Time','End Date','End Time','Status']
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
      escapeCSV(b.building.name),
      escapeCSV(b.room.name),
      escapeCSV(formatDate(b.startDate)),
      escapeCSV(formatTime(b.startDate)),
      escapeCSV(formatDate(b.endDate)),
      escapeCSV(formatTime(b.endDate)),
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
        <td style="padding:8px;border:1px solid #e6edf3">${b.building.name}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${b.room.name}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${formatDate(b.startDate)} ${formatTime(b.startDate)}</td>
        <td style="padding:8px;border:1px solid #e6edf3">${formatDate(b.endDate)} ${formatTime(b.endDate)}</td>
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
          <Button>+ New Booking</Button>
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
                <th className="px-6 py-3">Reference</th>
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
                  <td className="px-6 py-4 font-medium text-slate-900">{booking.bookingReference}</td>
                  <td className="px-6 py-4 text-slate-600">{booking.submittedBy.name || booking.submittedBy.email}</td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 font-medium">{booking.room.name}</div>
                    <div className="text-xs text-slate-500">{booking.building.name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div>{formatDate(booking.startDate)}</div>
                    <div className="text-xs text-slate-400">{formatTime(booking.startDate)} - {formatTime(booking.endDate)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={booking.approvalStatus === 'APPROVED' ? 'success' : booking.approvalStatus === 'PENDING' ? 'warning' : 'danger'}>
                      {booking.approvalStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {booking.approvalStatus === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setActiveBooking(booking); setModalType('APPROVE'); }} className="p-1 hover:bg-emerald-100 text-emerald-600 rounded-full"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setActiveBooking(booking); setModalType('REJECT'); }} className="p-1 hover:bg-rose-100 text-rose-600 rounded-full"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {activeBooking && (
        <>
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
            onConfirm={() => handleAction('REJECTED')}
          />
        </>
      )}
    </div>
  );
}
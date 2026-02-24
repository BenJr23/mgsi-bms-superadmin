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
          <Button variant="outline">Export</Button>
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
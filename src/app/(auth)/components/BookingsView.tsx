import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Search, Filter, MoreHorizontal, Check, X, Loader2 } from 'lucide-react';
import { ApproveBookingModal } from './Modals/ApproveBookingModal';
import { RejectBookingModal } from './Modals/RejectBookingModal';
import { useSession } from '@/lib/auth-client';

type BookingWithRelations = {
  id: string;
  bookingReference: string;
  startDate: string;
  endDate: string;
  bookingType: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  building: { name: string };
  room: { name: string };
  submittedBy: { name: string | null; email: string };
  updatedBy?: { id: string; name?: string | null } | null;
};

export function BookingsView() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingWithRelations | null>(null);
  const [modalType, setModalType] = useState<'NONE' | 'APPROVE' | 'REJECT'>('NONE');

  const { data: session } = useSession();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/bookings'); 
        if (!response.ok) throw new Error('Failed to fetch bookings');
        const data = await response.json();
        setBookings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!activeBooking) return;
    
    try {
      const response = await fetch(`/api/${activeBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status }),
      });

      if (response.ok) {
        // Optimistically update the local state
        setBookings(prev => prev.map(b => 
          b.id === activeBooking.id ? { ...b, approvalStatus: status } : b
        ));
        setModalType('NONE');
        setActiveBooking(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update booking");
      }
    } catch (err) {
      console.error("Action failed", err);
      alert("A network error occurred.");
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
            <input type="text" placeholder="Search bookings..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500" />
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2"><Filter className="w-4 h-4" />Filter</Button>
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
              {bookings.map((booking) => (
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
            onClose={() => setModalType('NONE')}
            bookingRef={activeBooking.bookingReference}
            clientName={activeBooking.submittedBy.name || activeBooking.submittedBy.email}
            onConfirm={() => handleAction('APPROVED')}
          />
          <RejectBookingModal
            isOpen={modalType === 'REJECT'}
            onClose={() => setModalType('NONE')}
            bookingRef={activeBooking.bookingReference}
            clientName={activeBooking.submittedBy.name || activeBooking.submittedBy.email}
            onConfirm={() => handleAction('REJECTED')}
          />
        </>
      )}
    </div>
  );
}
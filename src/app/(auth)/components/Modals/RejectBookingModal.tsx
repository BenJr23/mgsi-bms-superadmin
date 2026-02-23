import React from 'react';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface RejectBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRef: string;
  clientName: string;
  onConfirm: () => void;
}

export function RejectBookingModal({ 
  isOpen, 
  onClose, 
  bookingRef, 
  clientName, 
  onConfirm, 
}: RejectBookingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden border border-slate-200">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50">
              <X className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 leading-none">Reject Booking</h3>
              <p className="text-slate-500 text-sm mt-1">Decline this booking request</p>
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-rose-500 shrink-0 mt-0.5">
              <span className="text-rose-600 font-bold text-xs">!</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-rose-700 text-sm">Confirm Rejection</p>
              <p className="text-rose-600/80 text-[13px] leading-relaxed">
                Are you sure you want to reject booking <span className="font-bold text-rose-700">{bookingRef}</span>?
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-50">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onConfirm()} 
            className="px-4 py-2 text-sm font-medium bg-[#101828] text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Reject Booking
          </button>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

interface ApproveBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRef: string;
  clientName: string;
  onConfirm: () => void;
}

export function ApproveBookingModal({ 
  isOpen, 
  onClose, 
  bookingRef, 
  clientName, 
  onConfirm, 
}: ApproveBookingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden border border-slate-200">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 leading-none">Approve Booking</h3>
              <p className="text-slate-500 text-sm mt-1">Confirm and finalize this request</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-emerald-500 shrink-0 mt-0.5">
              <span className="text-emerald-600 font-bold text-xs">!</span>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-emerald-700 text-sm">Confirm Approval</p>
              <p className="text-emerald-600/80 text-[13px] leading-relaxed">
                You are about to approve booking <span className="font-bold text-emerald-700">{bookingRef}</span> for <span className="font-bold text-emerald-700">{clientName}</span>.
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
            Approve Booking
          </button>
        </div>
      </div>
    </div>
  );
}
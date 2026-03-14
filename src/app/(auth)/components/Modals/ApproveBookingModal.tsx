import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2 } from 'lucide-react';

interface ApproveBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRef: string;
  clientName: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
}

export function ApproveBookingModal({ 
  isOpen, 
  onClose, 
  bookingRef, 
  clientName, 
  onConfirm, 
}: ApproveBookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const result = await onConfirm();

      if (result.success) {
        setSuccess('Booking confirmed successfully.');
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(result.error || 'Failed to approve booking.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setIsSubmitting(false);
    }
  };

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

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-50">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-[#101828] text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Approving...' : 'Approve Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
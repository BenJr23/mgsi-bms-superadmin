'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { resetUserPassword } from '@/app/_actions/users'
import { AlertCircle, Key } from 'lucide-react'

interface ResetUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  userId?: string
  userName?: string
}

export function ResetUserModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userName,
}: ResetUserModalProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleReset = async () => {
    if (!userId) return

    setIsResetting(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await resetUserPassword(userId)

      if (result.success) {
        setSuccessMessage(
          `Password reset successful! A new temporary password has been sent to the user's email.`
        )
        setIsResetting(false)

        setTimeout(() => {
          setSuccessMessage('')
          onClose()
          onSuccess?.()
        }, 2000)
      } else {
        setError(result.error || 'Failed to reset password')
        setIsResetting(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setIsResetting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
        style={{
          animation: 'modalIn 0.18s ease-out',
        }}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reset Password</h2>
              <p className="text-sm text-slate-500 mt-0.5">Generate a new temporary password</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex-1">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">Confirm Password Reset</p>
                <p>
                  A new temporary password will be generated and sent to{' '}
                  <span className="font-semibold">{userName}</span>'s email. They will need to use this new password on their next login.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
                <div className="w-4 h-4 bg-emerald-600 rounded-full mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isResetting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { deleteUser } from '@/app/_actions/users'
import { AlertCircle, Trash2 } from 'lucide-react'

interface DeleteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  userId?: string
  userName?: string
}

export function DeleteUserModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userName,
}: DeleteUserModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!userId) return

    setIsDeleting(true)
    setError('')

    try {
      const result = await deleteUser(userId)

      if (result.success) {
        setIsDeleting(false)
        setTimeout(() => {
          onClose()
          onSuccess?.()
        }, 300)
      } else {
        setError(result.error || 'Failed to delete user')
        setIsDeleting(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setIsDeleting(false)
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
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Delete User</h2>
              <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex-1">
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-rose-700">
                <p className="font-semibold mb-1">Permanent Deletion</p>
                <p>
                  You are about to permanently delete the user <span className="font-semibold">{userName}</span>. All associated data including sessions and accounts will be removed.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete User'}
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

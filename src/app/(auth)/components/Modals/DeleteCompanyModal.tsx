'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { deleteCompany } from '@/app/_actions/companies'
import { Button } from '../ui/Button'
import { Modal } from './AddBuildingModal'

interface DeleteCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  companyId?: string
  companyName?: string
  onSuccess?: () => void
}

export function DeleteCompanyModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  onSuccess,
}: DeleteCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setSubmitError('')
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (!companyId) {
      setSubmitError('Company not found.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const result = await deleteCompany(companyId)

      if (result.success) {
        onClose()
        onSuccess?.()
      } else {
        setSubmitError(result.error || 'Failed to delete company.')
      }
    } catch {
      setSubmitError('An unexpected error occurred while deleting company.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Company"
      description="This action cannot be undone."
      size="sm"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" />
          <p className="text-sm text-rose-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-rose-800">{companyName || 'this company'}</span>?
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Deletion is blocked when this company still has active bookings.
        </p>

        {submitError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {submitError}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting ? 'Deleting...' : 'Delete Company'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

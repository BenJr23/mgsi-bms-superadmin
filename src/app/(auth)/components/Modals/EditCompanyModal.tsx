'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { getCompanyRepresentativeCandidates, updateCompany } from '@/app/_actions/companies'

type RepresentativeCandidate = {
  id: string
  name: string
  email: string
}

interface EditCompanyForm {
  name: string
  allottedCreditHours: number | ''
  representativeUserId: string
}

interface EditCompanyFormErrors {
  name?: string
  allottedCreditHours?: string
}

interface EditCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  company?: {
    id: string
    name: string
    allottedCreditHours: number
    representativeUserId?: string | null
  } | null
}

export function EditCompanyModal({ isOpen, onClose, onSuccess, company }: EditCompanyModalProps) {
  const [formData, setFormData] = useState<EditCompanyForm>({ name: '', allottedCreditHours: '', representativeUserId: '' })
  const [formErrors, setFormErrors] = useState<EditCompanyFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [representatives, setRepresentatives] = useState<RepresentativeCandidate[]>([])

  useEffect(() => {
    if (!isOpen || !company) return

    setFormData({
      name: company.name,
      allottedCreditHours: company.allottedCreditHours,
      representativeUserId: company.representativeUserId || '',
    })
    setFormErrors({})
    setSubmitError('')
    setSubmitSuccess('')
  }, [isOpen, company])

  useEffect(() => {
    const fetchRepresentatives = async () => {
      if (!isOpen || !company?.id) {
        setRepresentatives([])
        return
      }

      const result = await getCompanyRepresentativeCandidates(company.id)
      if (result.success && result.data) {
        setRepresentatives(result.data)
      } else {
        setRepresentatives([])
      }
    }

    fetchRepresentatives()
  }, [isOpen, company?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!company?.id) {
      setSubmitError('Missing company information')
      return
    }

    const errors: EditCompanyFormErrors = {}

    if (!formData.name?.trim()) errors.name = 'Company name is required'
    if (formData.allottedCreditHours === '' || formData.allottedCreditHours < 0) {
      errors.allottedCreditHours = 'Valid credit hours required'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const result = await updateCompany({
        id: company.id,
        name: formData.name.trim(),
        allottedCreditHours: Number(formData.allottedCreditHours),
        representativeUserId: formData.representativeUserId || undefined,
      })

      if (result.success) {
        setSubmitSuccess('Company updated successfully!')
        setFormErrors({})

        if (onSuccess) {
          onSuccess()
        }

        setTimeout(() => {
          onClose()
          setSubmitSuccess('')
        }, 1200)
      } else {
        setSubmitError(result.error || 'Failed to update company')
      }
    } catch {
      setSubmitError('Error updating company')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormErrors({})
      setSubmitError('')
      setSubmitSuccess('')
      onClose()
    }
  }

  if (!isOpen || !company) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleClose} />
      <Card className="relative w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Edit Company</h2>

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{submitSuccess}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (formErrors.name) setFormErrors({ ...formErrors, name: undefined })
                }}
                placeholder="e.g. Acme Corporation"
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  formErrors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                }`}
              />
              {formErrors.name && <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Representative
              </label>
              <select
                value={formData.representativeUserId}
                onChange={(e) => {
                  setFormData({ ...formData, representativeUserId: e.target.value })
                }}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent border-slate-300"
              >
                <option value="">No representative</option>
                {representatives.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} ({rep.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Admin can assign one representative for credit alert emails.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Allotted Credit Hours <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.allottedCreditHours}
                onChange={(e) => {
                  setFormData({ ...formData, allottedCreditHours: e.target.value ? Number(e.target.value) : '' })
                  if (formErrors.allottedCreditHours) {
                    setFormErrors({ ...formErrors, allottedCreditHours: undefined })
                  }
                }}
                placeholder="e.g. 100"
                min="0"
                step="0.5"
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  formErrors.allottedCreditHours ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                }`}
              />
              {formErrors.allottedCreditHours && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.allottedCreditHours}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

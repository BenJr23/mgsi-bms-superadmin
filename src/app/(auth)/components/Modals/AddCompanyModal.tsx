'use client'

import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { createCompany } from '@/app/_actions/companies'

interface AddCompanyForm {
  name: string
  allottedCreditHours: number | ''
}

interface AddCompanyFormErrors {
  name?: string
  allottedCreditHours?: string
}

interface AddCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddCompanyModal({ isOpen, onClose, onSuccess }: AddCompanyModalProps) {
  const [formData, setFormData] = useState<AddCompanyForm>({ name: '', allottedCreditHours: '' })
  const [formErrors, setFormErrors] = useState<AddCompanyFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: AddCompanyFormErrors = {}

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
      const result = await createCompany({
        name: formData.name.trim(),
        allottedCreditHours: Number(formData.allottedCreditHours),
      })

      if (result.success) {
        setSubmitSuccess('Company created successfully!')
        setFormData({ name: '', allottedCreditHours: '' })
        setFormErrors({})
        
        if (onSuccess) {
          onSuccess()
        }

        setTimeout(() => {
          onClose()
          setSubmitSuccess('')
        }, 1500)
      } else {
        setSubmitError(result.error || 'Failed to create company')
      }
    } catch (err) {
      setSubmitError('Error creating company')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', allottedCreditHours: '' })
      setFormErrors({})
      setSubmitError('')
      setSubmitSuccess('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleClose} />
      <Card className="relative w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Company</h2>

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
                Allotted Credit Hours <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.allottedCreditHours}
                onChange={(e) => {
                  setFormData({ ...formData, allottedCreditHours: e.target.value ? Number(e.target.value) : '' })
                  if (formErrors.allottedCreditHours) setFormErrors({ ...formErrors, allottedCreditHours: undefined })
                }}
                placeholder="e.g. 100"
                min="0"
                step="0.5"
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  formErrors.allottedCreditHours ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                }`}
              />
              {formErrors.allottedCreditHours && <p className="text-xs text-rose-600 mt-1">{formErrors.allottedCreditHours}</p>}
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
                {isSubmitting ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

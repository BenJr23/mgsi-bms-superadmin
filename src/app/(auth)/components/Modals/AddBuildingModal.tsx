
import React, { useEffect, useState } from 'react'
import { X, ImageIcon, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])
  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  if (!isOpen) return null
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]`}
        style={{
          animation: 'modalIn 0.18s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
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

type BuildingStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

interface BuildingFormData {
  buildingName: string
  buildingCode: string
  address: string
  description: string
  imageUrl: string
  status: BuildingStatus
}

const emptyForm: BuildingFormData = {
  buildingName: '',
  buildingCode: '',
  address: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
}

interface AddBuildingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddBuildingModal({ isOpen, onClose }: AddBuildingModalProps) {
  const [form, setForm] = useState<BuildingFormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<BuildingFormData>>({})

  const validate = (): boolean => {
    const newErrors: Partial<BuildingFormData> = {}
    if (!form.buildingName.trim())
      newErrors.buildingName = 'Building name is required.'
    if (!form.buildingCode.trim())
      newErrors.buildingCode = 'Building code is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    // TODO: wire to API
    console.log('New building:', form)
    handleClose()
  }

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const field = (key: keyof BuildingFormData, value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

  const inputClass = (hasError?: string) =>
    `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${hasError ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Building"
      description="Fill in the details below to register a new building."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Name + Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Building Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Innovation Hub"
              value={form.buildingName}
              onChange={(e) => field('buildingName', e.target.value)}
              className={inputClass(errors.buildingName)}
            />
            {errors.buildingName && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" /> {errors.buildingName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Building Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BLD-006"
              value={form.buildingCode}
              onChange={(e) =>
                field('buildingCode', e.target.value.toUpperCase())
              }
              className={`${inputClass(errors.buildingCode)} font-mono`}
            />
            {errors.buildingCode && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" /> {errors.buildingCode}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <div className="flex gap-3">
            {(['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as BuildingStatus[]).map(
              (s) => (
                <label
                  key={s}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-medium cursor-pointer transition-all ${form.status === s ? (s === 'ACTIVE' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : s === 'MAINTENANCE' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-400 bg-slate-100 text-slate-700') : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => field('status', s)}
                    className="sr-only"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${s === 'ACTIVE' ? 'bg-emerald-500' : s === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-slate-400'}`}
                  />
                  {s}
                </label>
              ),
            )}
          </div>
        </div>

        {/* Row 3: Address */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Address
          </label>
          <input
            type="text"
            placeholder="e.g. 123 Tech Blvd, Silicon Valley"
            value={form.address}
            onChange={(e) => field('address', e.target.value)}
            className={inputClass()}
          />
        </div>

        {/* Row 4: Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Brief description of the building..."
            value={form.description}
            onChange={(e) => field('description', e.target.value)}
            className={`${inputClass()} resize-none`}
          />
        </div>

        {/* Row 5: Image URL */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Image URL
          </label>
          <input
            type="url"
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => field('imageUrl', e.target.value)}
            className={inputClass()}
          />
          {form.imageUrl && (
            <div className="mt-2 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={form.imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Create Building</Button>
        </div>
      </form>
    </Modal>
  )
}

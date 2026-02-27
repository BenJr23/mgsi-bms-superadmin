'use client'

import React, { useEffect, useState } from 'react'
import { X, ImageIcon, AlertCircle, Loader, Upload } from 'lucide-react'
import { Button } from '../ui/Button'
import { updateBuilding, getBuildingById, uploadBuildingImage } from '@/app/_actions/buildings'

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

interface EditBuildingModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId?: string
  onSuccess?: () => void
}

export function EditBuildingModal({
  isOpen,
  onClose,
  buildingId,
  onSuccess,
}: EditBuildingModalProps) {
  const [form, setForm] = useState<BuildingFormData>({
    buildingName: '',
    buildingCode: '',
    address: '',
    description: '',
    imageUrl: '',
    status: 'ACTIVE',
  })
  const [errors, setErrors] = useState<Partial<BuildingFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState<string>('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')
  const [imageUploadSuccess, setImageUploadSuccess] = useState('')
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  const validateImageFile = (file: File): boolean => {
    setImageUploadError('')

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select an image file.')
      return false
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Please select an image smaller than 5MB.')
      return false
    }

    return true
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageUploadSuccess('')

    if (!file) {
      setSelectedImageFile(null)
      return
    }

    if (validateImageFile(file)) {
      setSelectedImageFile(file)
    } else {
      setSelectedImageFile(null)
    }
  }

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingImage(false)
    const file = e.dataTransfer.files?.[0] ?? null
    setImageUploadSuccess('')

    if (!file) return

    if (validateImageFile(file)) {
      setSelectedImageFile(file)
    } else {
      setSelectedImageFile(null)
    }
  }

  const handleUploadImage = async () => {
    if (!selectedImageFile) {
      setImageUploadError('Choose an image before uploading.')
      return
    }

    setIsUploadingImage(true)
    setImageUploadError('')
    setImageUploadSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', selectedImageFile)

      const result = await uploadBuildingImage(formData)

      if (!result.success || !result.image) {
        setImageUploadError(result.error || 'Failed to upload image.')
        return
      }

      field('imageUrl', result.image)
      setSelectedImageFile(null)
      setImageUploadSuccess('Image uploaded successfully.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload image.'
      setImageUploadError(message)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Load building data when modal opens
  useEffect(() => {
    if (isOpen && buildingId) {
      setIsLoadingData(true)
      setSubmitError('')
      setSubmitSuccess('')
      getBuildingById(buildingId).then((result) => {
        if (result.success && result.data) {
          setForm({
            buildingName: result.data.buildingName,
            buildingCode: result.data.buildingCode,
            address: result.data.address || '',
            description: result.data.description || '',
            imageUrl: result.data.imageUrl || '',
            status: result.data.status as BuildingStatus,
          })
        } else {
          setSubmitError(result.error || 'Failed to load building data')
        }
        setIsLoadingData(false)
      })
    }
  }, [isOpen, buildingId])

  const validate = (): boolean => {
    const newErrors: Partial<BuildingFormData> = {}
    if (!form.buildingName.trim())
      newErrors.buildingName = 'Building name is required.'
    if (!form.buildingCode.trim())
      newErrors.buildingCode = 'Building code is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !buildingId) return

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const result = await updateBuilding(buildingId, form)

      if (result.success) {
        setSubmitSuccess(
          `Building "${result.data?.buildingName}" updated successfully!`
        )
        setErrors({})

        // Close modal after 2 seconds and trigger refresh
        setTimeout(() => {
          setSubmitSuccess('')
          onClose()
          onSuccess?.()
        }, 2000)
      } else {
        setSubmitError(result.error || 'Failed to update building.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm({
      buildingName: '',
      buildingCode: '',
      address: '',
      description: '',
      imageUrl: '',
      status: 'ACTIVE',
    })
    setErrors({})
    setSubmitError('')
    setSubmitSuccess('')
    setSelectedImageFile(null)
    setImageUploadError('')
    setImageUploadSuccess('')
    setIsDraggingImage(false)
    onClose()
  }

  const field = (key: keyof BuildingFormData, value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

  const inputClass = (hasError?: string) =>
    `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${hasError ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`

  if (isLoadingData) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Building"
        description="Loading building details..."
        size="lg"
      >
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Building"
      description="Update the building details below."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-700">{submitError}</p>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
            <div className="w-4 h-4 bg-emerald-600 rounded-full mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-700">{submitSuccess}</p>
          </div>
        )}

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>

        {/* Row 5: Image URL */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Image URL
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingImage(true)
            }}
            onDragLeave={() => setIsDraggingImage(false)}
            onDrop={handleImageDrop}
            className={`rounded-lg border-2 border-dashed p-4 transition-colors ${isDraggingImage ? 'border-red-900 bg-red-50' : 'border-slate-300 bg-slate-50'}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4 mr-2" />
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                  disabled={isUploadingImage || isSubmitting}
                />
              </label>
              <Button
                type="button"
                onClick={handleUploadImage}
                disabled={!selectedImageFile || isUploadingImage || isSubmitting}
              >
                {isUploadingImage ? 'Uploading...' : 'Upload to Supabase'}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Drag and drop an image here, or choose a file (PNG/JPG up to 5MB).
            </p>
            {selectedImageFile && (
              <p className="text-xs text-slate-600 mt-2 truncate">
                Selected: {selectedImageFile.name}
              </p>
            )}
            {imageUploadError && (
              <p className="text-xs text-rose-600 mt-2">{imageUploadError}</p>
            )}
            {imageUploadSuccess && (
              <p className="text-xs text-emerald-700 mt-2">{imageUploadSuccess}</p>
            )}
          </div>
          <input
            type="url"
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => field('imageUrl', e.target.value)}
            className={inputClass()}
            disabled={isSubmitting}
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
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Building'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

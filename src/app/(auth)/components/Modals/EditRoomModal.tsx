'use client'

import React, { useEffect, useState } from 'react'
import {
  X,
  ImageIcon,
  AlertCircle,
  Loader,
  Wifi,
  Monitor,
  Presentation,
  Coffee,
  Video,
  Mic,
  PcCase,
  Wind,
  Upload,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { getRoomById, updateRoom, uploadRoomImage } from '@/app/_actions/rooms'
import { getBuildings } from '@/app/_actions/buildings'

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
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

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
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]`}
        style={{
          animation: 'modalIn 0.18s ease-out',
        }}
      >
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

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'

interface RoomFormData {
  roomName: string
  roomCode: string
  buildingId: string
  capacity: string
  status: RoomStatus
  description: string
  imageUrl: string
  amenities: string[]
}

interface BuildingOption {
  id: string
  buildingName: string
}

const AMENITY_OPTIONS = [
  {
    id: 'wifi',
    label: 'Wi-Fi',
    icon: Wifi,
  },
  {
    id: 'screen',
    label: 'Projector/Screen',
    icon: Monitor,
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: Presentation,
  },
  {
    id: 'coffee',
    label: 'Coffee Machine',
    icon: Coffee,
  },
  {
    id: 'video',
    label: 'Video Conferencing',
    icon: Video,
  },
  {
    id: 'mic',
    label: 'Microphone',
    icon: Mic,
  },
  {
    id: 'computers',
    label: 'Computers',
    icon: PcCase,
  },
  {
    id: 'aircon',
    label: 'Air Conditioning',
    icon: Wind,
  },
]

interface EditRoomModalProps {
  isOpen: boolean
  onClose: () => void
  roomId?: string
  onSuccess?: () => void
}

export function EditRoomModal({
  isOpen,
  onClose,
  roomId,
  onSuccess,
}: EditRoomModalProps) {
  const [form, setForm] = useState<RoomFormData>({
    roomName: '',
    roomCode: '',
    buildingId: '',
    capacity: '',
    status: 'AVAILABLE',
    description: '',
    imageUrl: '',
    amenities: [],
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof RoomFormData, string>>
  >({})
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

      const result = await uploadRoomImage(formData)

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

  // Load buildings on mount
  useEffect(() => {
    const loadBuildings = async () => {
      setIsLoadingBuildings(true)
      try {
        const result = await getBuildings()
        setBuildings(result.success ? result.data ?? [] : [])
      } catch {
        setBuildings([])
      } finally {
        setIsLoadingBuildings(false)
      }
    }

    void loadBuildings()
  }, [])

  // Load room data when modal opens
  useEffect(() => {
    if (isOpen && roomId) {
      setIsLoadingData(true)
      setSubmitError('')
      setSubmitSuccess('')
      getRoomById(roomId).then((result) => {
        if (result.success && result.data) {
          setForm({
            roomName: result.data.roomName,
            roomCode: result.data.roomCode || '',
            buildingId: result.data.buildingId,
            capacity: result.data.capacity.toString(),
            status: result.data.status,
            description: result.data.description || '',
            imageUrl: result.data.imageUrl || '',
            amenities: result.data.amenities || [],
          })
        } else {
          setSubmitError(result.error || 'Failed to load room data')
        }
        setIsLoadingData(false)
      })
    }
  }, [isOpen, roomId])

  const handleClose = () => {
    setForm({
      roomName: '',
      roomCode: '',
      buildingId: '',
      capacity: '',
      status: 'AVAILABLE',
      description: '',
      imageUrl: '',
      amenities: [],
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

  const field = <K extends keyof RoomFormData>(
    key: K,
    value: RoomFormData[K],
  ) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

  const toggleAmenity = (id: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter((a) => a !== id)
        : [...prev.amenities, id],
    }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof RoomFormData, string>> = {}
    if (!form.roomName.trim()) e.roomName = 'Room name is required.'
    if (!form.buildingId) e.buildingId = 'Please select a building.'
    if (
      !form.capacity ||
      isNaN(Number(form.capacity)) ||
      Number(form.capacity) < 1
    )
      e.capacity = 'Enter a valid capacity (≥ 1).'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !roomId) return

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const result = await updateRoom(roomId, {
        roomName: form.roomName,
        roomCode: form.roomCode || undefined,
        buildingId: form.buildingId,
        capacity: Number(form.capacity),
        status: form.status,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        amenities: form.amenities.length > 0 ? form.amenities : undefined,
      })

      if (result.success) {
        setSubmitSuccess(`Room "${result.data?.roomName}" updated successfully!`)
        setErrors({})

        setTimeout(() => {
          setSubmitSuccess('')
          handleClose()
          onSuccess?.()
        }, 2000)
      } else {
        setSubmitError(result.error || 'Failed to update room.')
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`

  const statusConfig: Record<
    RoomStatus,
    {
      border: string
      bg: string
      text: string
      dot: string
    }
  > = {
    AVAILABLE: {
      border: 'border-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    OCCUPIED: {
      border: 'border-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    MAINTENANCE: {
      border: 'border-rose-400',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      dot: 'bg-rose-400',
    },
    INACTIVE: {
      border: 'border-slate-400',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      dot: 'bg-slate-400',
    },
  }

  if (isLoadingData) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Room"
        description="Loading room details..."
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
      title="Edit Room"
      description="Update the room details below."
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
              Room Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Conference Room A"
              value={form.roomName}
              onChange={(e) => field('roomName', e.target.value)}
              className={inputClass(errors.roomName)}
              disabled={isSubmitting}
            />
            {errors.roomName && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" /> {errors.roomName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Room Code
            </label>
            <input
              type="text"
              placeholder="e.g. RM-101"
              value={form.roomCode}
              onChange={(e) => field('roomCode', e.target.value.toUpperCase())}
              className={`${inputClass()} font-mono`}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Row 2: Building + Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Building <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.buildingId}
              onChange={(e) => field('buildingId', e.target.value)}
              className={inputClass(errors.buildingId)}
              disabled={isSubmitting || isLoadingBuildings}
            >
              <option value="">Select a building...</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.buildingName}
                </option>
              ))}
            </select>
            {errors.buildingId && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" /> {errors.buildingId}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Capacity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 10"
              value={form.capacity}
              onChange={(e) => field('capacity', e.target.value)}
              className={inputClass(errors.capacity)}
              disabled={isSubmitting}
              min="1"
            />
            {errors.capacity && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" /> {errors.capacity}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'] as RoomStatus[]).map(
              (s) => {
                const config = statusConfig[s]
                return (
                  <label
                    key={s}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-xs font-medium cursor-pointer transition-all ${form.status === s ? `${config.border} ${config.bg} ${config.text}` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
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
                    <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                    {s}
                  </label>
                )
              },
            )}
          </div>
        </div>

        {/* Row 4: Amenities */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AMENITY_OPTIONS.map((amenity) => {
              const Icon = amenity.icon
              return (
                <label
                  key={amenity.id}
                  className={`flex items-center gap-2 py-2 px-3 rounded-md border text-xs cursor-pointer transition-all ${form.amenities.includes(amenity.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(amenity.id)}
                    onChange={() => toggleAmenity(amenity.id)}
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <Icon className="w-3 h-3" />
                  <span>{amenity.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Row 5: Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Brief description of the room…"
            value={form.description}
            onChange={(e) => field('description', e.target.value)}
            className={`${inputClass()} resize-none`}
            disabled={isSubmitting}
          />
        </div>

        {/* Row 6: Image URL */}
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
            placeholder="https://…"
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
              'Update Room'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

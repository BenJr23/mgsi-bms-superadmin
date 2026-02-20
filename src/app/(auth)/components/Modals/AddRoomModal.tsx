'use client'

import React, { useEffect, useState } from 'react'
import {
  X,
  Users,
  Wifi,
  Monitor,
  Coffee,
  Mic,
  Video,
  PcCase,
  Wind,
  Presentation,
  AlertCircle,
  ImageIcon,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { getBuildings } from '@/app/actions/buildings'
import { createRoom } from '@/app/actions/rooms'
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

const emptyForm: RoomFormData = {
  roomName: '',
  roomCode: '',
  buildingId: '',
  capacity: '',
  status: 'AVAILABLE',
  description: '',
  imageUrl: '',
  amenities: [],
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

interface AddRoomModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddRoomModal({ isOpen, onClose }: AddRoomModalProps) {
  const [form, setForm] = useState<RoomFormData>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof RoomFormData, string>>
  >({})
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState<string>('')

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    const loadBuildings = async () => {
      setIsLoadingBuildings(true)
      try {
        const result = await getBuildings()
        if (isMounted) {
          setBuildings(result.success ? result.data ?? [] : [])
        }
      } catch {
        if (isMounted) setBuildings([])
      } finally {
        if (isMounted) setIsLoadingBuildings(false)
      }
    }

    void loadBuildings()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    setSubmitError('')
    setSubmitSuccess('')
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
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const result = await createRoom({
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
        setSubmitSuccess(
          `Room "${result.data?.roomName}" created successfully!`
        )
        setForm(emptyForm)
        setErrors({})

        // Auto-close after 2 seconds
        setTimeout(() => {
          setSubmitSuccess('')
          handleClose()
        }, 2000)
      } else {
        setSubmitError(result.error || 'Failed to create room.')
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Room"
      description="Fill in the details to register a new room."
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
            />
            {errors.roomName && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" />
                {errors.roomName}
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
            />
            <p className="text-xs text-slate-400">Optional unique identifier.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Building <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.buildingId}
              onChange={(e) => field('buildingId', e.target.value)}
              className={inputClass(errors.buildingId)}
              disabled={isLoadingBuildings}
            >
              <option value="">
                {isLoadingBuildings ? 'Loading buildings…' : 'Select a building…'}
              </option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.buildingName}
                </option>
              ))}
            </select>
            {errors.buildingId && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" />
                {errors.buildingId}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Capacity <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="number"
                min={1}
                placeholder="e.g. 12"
                value={form.capacity}
                onChange={(e) => field('capacity', e.target.value)}
                className={`${inputClass(errors.capacity)} pl-9`}
              />
            </div>
            {errors.capacity && (
              <p className="flex items-center gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3 h-3" />
                {errors.capacity}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(statusConfig) as RoomStatus[]).map((s) => {
              const cfg = statusConfig[s]
              const active = form.status === s
              return (
                <label
                  key={s}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-xs font-medium cursor-pointer transition-all ${active ? `${cfg.border} ${cfg.bg} ${cfg.text}` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={active}
                    onChange={() => field('status', s)}
                    className="sr-only"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${active ? cfg.dot : 'bg-slate-300'}`}
                  />
                  {s}
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AMENITY_OPTIONS.map(({ id, label, icon: Icon }) => {
              const checked = form.amenities.includes(id)
              return (
                <label
                  key={id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium cursor-pointer transition-all ${checked ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAmenity(id)}
                    className="sr-only"
                  />
                  <Icon
                    className={`w-3.5 h-3.5 ${checked ? 'text-indigo-500' : 'text-slate-400'}`}
                  />
                  {label}
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            rows={2}
            placeholder="Brief description of the room…"
            value={form.description}
            onChange={(e) => field('description', e.target.value)}
            className={`${inputClass()} resize-none`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Image URL
          </label>
          <input
            type="url"
            placeholder="https://…"
            value={form.imageUrl}
            onChange={(e) => field('imageUrl', e.target.value)}
            className={inputClass()}
          />
          {form.imageUrl && (
            <div className="mt-2 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
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

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Room'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

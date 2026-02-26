'use client'

import React, { useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  Building2,
  DoorOpen,
  Clock,
  Users,
  Mail,
  Phone,
  MessageSquare,
  AlertCircle,
  Zap,
  CalendarClock,
} from 'lucide-react'

type BookingType = 'HOURLY' | 'DAILY'

interface WalkInFormData {
  clientName: string
  email: string
  phoneNumber: string
  companyName: string
  buildingId: string
  roomId: string
  bookingType: BookingType
  date: string
  timeStart: string
  timeEnd: string
  attendeeCount: string
  message: string
}

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
const endTime = `${pad(Math.min(now.getHours() + 1, 23))}:${pad(now.getMinutes())}`

const emptyForm: WalkInFormData = {
  clientName: '',
  email: '',
  phoneNumber: '',
  companyName: '',
  buildingId: '',
  roomId: '',
  bookingType: 'HOURLY',
  date: todayStr,
  timeStart: currentTime,
  timeEnd: endTime,
  attendeeCount: '',
  message: '',
}

const BUILDINGS = [
  {
    id: 'bld-001',
    name: 'Innovation Hub',
    rooms: [
      {
        id: 'rm-101',
        name: 'Conference Room A',
        capacity: 12,
      },
      {
        id: 'rm-102',
        name: 'Auditorium',
        capacity: 200,
      },
      {
        id: 'rm-103',
        name: 'Lab 3',
        capacity: 15,
      },
    ],
  },
  {
    id: 'bld-002',
    name: 'Downtown Center',
    rooms: [
      {
        id: 'rm-201',
        name: 'Huddle Room 1',
        capacity: 4,
      },
      {
        id: 'rm-202',
        name: 'Meeting B',
        capacity: 10,
      },
      {
        id: 'rm-203',
        name: 'Desk 12',
        capacity: 1,
      },
    ],
  },
  {
    id: 'bld-003',
    name: 'West Wing Annex',
    rooms: [
      {
        id: 'rm-301',
        name: 'Training Lab',
        capacity: 30,
      },
      {
        id: 'rm-302',
        name: 'Banquet Hall',
        capacity: 100,
      },
    ],
  },
  {
    id: 'bld-004',
    name: 'Executive Tower',
    rooms: [
      {
        id: 'rm-501',
        name: 'Executive Suite',
        capacity: 8,
      },
      {
        id: 'rm-502',
        name: 'Board Room',
        capacity: 20,
      },
    ],
  },
]

interface WalkInBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: WalkInFormData) => void
  onSuccess?: () => void
}

export function WalkInBookingModal({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
}: WalkInBookingModalProps) {
  const [form, setForm] = useState<WalkInFormData>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof WalkInFormData, string>>
  >({})

  const selectedBuilding = useMemo(
    () => BUILDINGS.find((b) => b.id === form.buildingId),
    [form.buildingId],
  )

  const selectedRoom = useMemo(
    () => selectedBuilding?.rooms.find((r) => r.id === form.roomId),
    [selectedBuilding, form.roomId],
  )

  const field = <K extends keyof WalkInFormData>(
    key: K,
    value: WalkInFormData[K],
  ) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

  const formatPhilippinePhone = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    const cleaned = digits.slice(-10)
    if (cleaned.length === 0) return '+63 '
    if (cleaned.length <= 3) return `+63 ${cleaned}`
    if (cleaned.length <= 6)
      return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof WalkInFormData, string>> = {}
    if (!form.clientName.trim()) e.clientName = 'Client name is required.'
    if (!form.email.trim()) e.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address.'

    const phoneDigitsOnly = form.phoneNumber.replace(/\D/g, '')
    if (phoneDigitsOnly.length > 0) {
      const lastTenDigits = phoneDigitsOnly.slice(-10)
      if (lastTenDigits.length !== 10 || lastTenDigits[0] !== '9') {
        e.phoneNumber = 'Please enter a valid Philippine phone number.'
      }
    }

    if (!form.buildingId) e.buildingId = 'Please select a building.'
    if (!form.roomId) e.roomId = 'Please select a room.'
    if (!form.timeStart) e.timeStart = 'Start time is required.'
    if (!form.timeEnd) e.timeEnd = 'End time is required.'
    if (form.timeStart && form.timeEnd && form.timeStart >= form.timeEnd)
      e.timeEnd = 'End time must be after start time.'
    if (
      form.attendeeCount &&
      selectedRoom &&
      Number(form.attendeeCount) > selectedRoom.capacity
    )
      e.attendeeCount = `Exceeds room capacity (${selectedRoom.capacity}).`

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit?.(form)
    onSuccess?.()
    handleClose()
  }

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleBuildingChange = (buildingId: string) => {
    setForm((prev) => ({
      ...prev,
      buildingId,
      roomId: '',
    }))
  }

  const inputClass = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="flex items-center gap-1 text-xs text-rose-600 mt-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {msg}
      </p>
    ) : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Walk-In Booking"
      description="Create an instant booking for a walk-in client."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="p-1.5 bg-amber-100 rounded-md">
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Instant Booking
            </p>
            <p className="text-xs text-amber-600">
              This booking will be auto-approved and marked as active
              immediately.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            Client Information
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Client Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John Smith"
                value={form.clientName}
                onChange={(e) => field('clientName', e.target.value)}
                className={inputClass(errors.clientName)}
              />
              <ErrorMsg msg={errors.clientName} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  placeholder="e.g. client@company.com"
                  value={form.email}
                  onChange={(e) => field('email', e.target.value)}
                  className={`${inputClass(errors.email)} pl-9`}
                />
              </div>
              <ErrorMsg msg={errors.email} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">
                  +63
                </span>
                <input
                  type="tel"
                  placeholder="9XX XXX XXXX"
                  value={form.phoneNumber.replace('+63 ', '')}
                  onChange={(e) => {
                    const value = e.target.value
                    const digitsOnly = value.replace(/\D/g, '')
                    if (digitsOnly.length <= 10) {
                      const formatted = formatPhilippinePhone(value)
                      field('phoneNumber', formatted)
                    }
                  }}
                  maxLength={18}
                  className={`${inputClass(errors.phoneNumber)} pl-20`}
                />
              </div>
              <ErrorMsg msg={errors.phoneNumber} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Company{' '}
                <span className="text-xs font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={form.companyName}
                onChange={(e) => field('companyName', e.target.value)}
                className={inputClass()}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            Location
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Building <span className="text-rose-500">*</span>
                </span>
              </label>
              <select
                value={form.buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className={inputClass(errors.buildingId)}
              >
                <option value="">Select building…</option>
                {BUILDINGS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ErrorMsg msg={errors.buildingId} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                  Room <span className="text-rose-500">*</span>
                </span>
              </label>
              <select
                value={form.roomId}
                onChange={(e) => field('roomId', e.target.value)}
                disabled={!form.buildingId}
                className={`${inputClass(errors.roomId)} ${!form.buildingId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {form.buildingId ? 'Select room…' : 'Select a building first'}
                </option>
                {selectedBuilding?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Cap: {r.capacity})
                  </option>
                ))}
              </select>
              <ErrorMsg msg={errors.roomId} />
            </div>
          </div>

          {selectedRoom && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-100">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">
                <strong>{selectedRoom.name}</strong> — max capacity{' '}
                {selectedRoom.capacity} people
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            Schedule
          </p>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Booking Type
            </label>
            <div className="flex gap-2">
              {(['HOURLY', 'DAILY'] as BookingType[]).map((t) => (
                <label
                  key={t}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border text-xs font-medium cursor-pointer transition-all ${form.bookingType === t ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="bookingType"
                    value={t}
                    checked={form.bookingType === t}
                    onChange={() => field('bookingType', t)}
                    className="sr-only"
                  />
                  <CalendarClock className="w-3 h-3" />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => field('date', e.target.value)}
                className={inputClass()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => field('timeStart', e.target.value)}
                  className={`${inputClass(errors.timeStart)} pl-9`}
                />
              </div>
              <ErrorMsg msg={errors.timeStart} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                End Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => field('timeEnd', e.target.value)}
                  className={`${inputClass(errors.timeEnd)} pl-9`}
                />
              </div>
              <ErrorMsg msg={errors.timeEnd} />
            </div>
          </div>

          <div className="sm:w-1/3">
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Attendees{' '}
              <span className="text-xs font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={form.attendeeCount}
                onChange={(e) => field('attendeeCount', e.target.value)}
                className={`${inputClass(errors.attendeeCount)} pl-9`}
              />
            </div>
            <ErrorMsg msg={errors.attendeeCount} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            Notes{' '}
            <span className="text-xs font-normal text-slate-400">
              (optional)
            </span>
          </label>
          <textarea
            rows={2}
            placeholder="Any special requirements or notes…"
            value={form.message}
            onChange={(e) => field('message', e.target.value)}
            className={`${inputClass()} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Create Walk-In Booking
          </Button>
        </div>
      </form>
    </Modal>
  )
}
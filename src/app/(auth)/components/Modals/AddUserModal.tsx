import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { createUser } from '@/app/_actions/users'
import { ReactivateUserModal } from './ReactivateUserModal'
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  AlertCircle,
  ImageIcon,
} from 'lucide-react'

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
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  React.useEffect(() => {
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
type UserRole = 'CLIENT' | 'ADMIN' | 'SUPERADMIN'
interface UserFormData {
  name: string
  email: string
  role: UserRole
  companyName: string
  phoneNumber: string
  contractEndDate: string
  image: string
}
const emptyForm: UserFormData = {
  name: '',
  email: '',
  role: 'CLIENT',
  companyName: '',
  phoneNumber: '',
  contractEndDate: '',
  image: '',
}
interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: Omit<UserFormData, 'confirmPassword'>) => void
}
const ROLE_OPTIONS: {
  value: UserRole
  label: string
  description: string
  color: string
  activeColor: string
  icon: React.ReactNode
}[] = [
  {
    value: 'CLIENT',
    label: 'Client',
    description: 'Can submit and manage their own bookings.',
    color: 'border-slate-200 text-slate-600',
    activeColor: 'border-indigo-400 bg-indigo-50 text-indigo-700',
    icon: <User className="w-4 h-4" />,
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Manages buildings, rooms and approves bookings.',
    color: 'border-slate-200 text-slate-600',
    activeColor: 'border-blue-400 bg-blue-50 text-blue-700',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    value: 'SUPERADMIN',
    label: 'Super Admin',
    description: 'Full system access including user management.',
    color: 'border-slate-200 text-slate-600',
    activeColor: 'border-purple-400 bg-purple-50 text-purple-700',
    icon: <Shield className="w-4 h-4" />,
  },
]

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')
  const [submitSuccess, setSubmitSuccess] = useState<string>('')
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false)
  const [reactivateUserId, setReactivateUserId] = useState<string | undefined>()
  const [reactivateUserEmail, setReactivateUserEmail] = useState<string | undefined>()

  const formatPhilippinePhone = (value: string): string => {
    // Extract only digits
    const digits = value.replace(/\D/g, '')
    // Keep only last 10 digits (to handle stored format with country code)
    const cleaned = digits.slice(-10)
    // Format as +63 XXX XXX XXXX
    if (cleaned.length === 0) return '+63 '
    if (cleaned.length <= 3) return `+63 ${cleaned}`
    if (cleaned.length <= 6) return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }

  const validatePhilippinePhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '')
    return digits.length === 10 && digits[0] === '9'
  }
  const field = <K extends keyof UserFormData>(
    key: K,
    value: UserFormData[K],
  ) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

  const handleRoleChange = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      companyName: role !== 'CLIENT' ? 'My GreatWork Spaces' : '',
    }))
  }
  const validate = (): boolean => {
    const e: Partial<Record<keyof UserFormData, string>> = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address.'
    
    // Only validate phone if user entered digits (phone is optional)
    const phoneDigitsOnly = form.phoneNumber.replace(/\D/g, '')
    if (phoneDigitsOnly.length > 0) {
      // Extract last 10 digits (to ignore the +63 country code)
      const lastTenDigits = phoneDigitsOnly.slice(-10)
      // Must be exactly 10 digits and start with 9
      if (lastTenDigits.length !== 10 || lastTenDigits[0] !== '9') {
        e.phoneNumber = 'Please enter a valid Philippine phone number.'
      }
    }
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
      const result = await createUser({
        name: form.name,
        email: form.email,
        role: form.role,
        companyName: form.companyName,
        phoneNumber: form.phoneNumber,
        contractEndDate: form.contractEndDate,
        image: form.image,
      })

      if (result.success) {
        setSubmitSuccess('User created successfully!')
        setForm(emptyForm)
        setErrors({})

        setTimeout(() => {
          setSubmitSuccess('')
          handleClose()
          onSuccess?.()
        }, 1500)
      } else if (result.requiresReactivation && result.reactivationUserId) {
        setReactivateUserId(result.reactivationUserId)
        setReactivateUserEmail(form.email)
        setIsReactivateModalOpen(true)
      } else {
        setSubmitError(result.error || 'Failed to create user.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }
  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    setSubmitError('')
    setSubmitSuccess('')
    setIsReactivateModalOpen(false)
    setReactivateUserId(undefined)
    setReactivateUserEmail(undefined)
    onClose()
  }

  const handleCloseReactivateModal = () => {
    setIsReactivateModalOpen(false)
    setReactivateUserId(undefined)
    setReactivateUserEmail(undefined)
  }

  const handleReactivationSuccess = () => {
    handleCloseReactivateModal()
    handleClose()
    onSuccess?.()
  }
  const inputClass = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`
  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="flex items-center gap-1 text-xs text-rose-600 mt-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {msg}
      </p>
    ) : null
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add New User"
        description="Create a new user account and assign their role."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-700">{submitError}</p>
          </div>
        )}

        {submitSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
            <div className="w-4 h-4 bg-emerald-600 rounded-full mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-700">{submitSuccess}</p>
          </div>
        )}

        {/* ── Section: Role Selection ── */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Role <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ROLE_OPTIONS.map((opt) => {
              const active = form.role === opt.value
              return (
                <label
                  key={opt.value}
                  className={`relative flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${active ? opt.activeColor : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={active}
                    onChange={() => handleRoleChange(opt.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {opt.icon}
                    {opt.label}
                  </div>
                  <p className="text-xs leading-snug opacity-70">
                    {opt.description}
                  </p>
                  {active && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current opacity-60" />
                  )}
                </label>
              )
            })}
          </div>
        </div>

        {/* ── Section: Personal Information ── */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            Personal Information
          </p>

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={form.name}
                  onChange={(e) => field('name', e.target.value)}
                  className={`${inputClass(errors.name)} pl-9`}
                />
              </div>
              <ErrorMsg msg={errors.name} />
            </div>

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
                    // Only allow digits to be input
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
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => field('email', e.target.value)}
                className={`${inputClass(errors.email)} pl-9`}
              />
            </div>
            <ErrorMsg msg={errors.email} />
          </div>

          {/* Company Name */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={form.companyName}
                onChange={(e) => field('companyName', e.target.value)}
                className={`${inputClass()} pl-9`}
              />
            </div>
          </div>

          {/* Contract End Date — only shown for CLIENT role */}
          {form.role === 'CLIENT' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Contract End Date
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="date"
                  value={form.contractEndDate}
                  onChange={(e) => field('contractEndDate', e.target.value)}
                  className={`${inputClass()} pl-9`}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Leave blank for indefinite access.
              </p>
            </div>
          )}

          {/* Avatar URL */}
          <div>
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              Profile Image URL
              <span className="text-xs font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <input
              type="url"
              placeholder="https://…"
              value={form.image}
              onChange={(e) => field('image', e.target.value)}
              className={inputClass()}
            />
            {form.image && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={form.image}
                  alt="Avatar preview"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <span className="text-xs text-slate-500">Avatar preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Password auto-generated info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">Password will be auto-generated and sent to the user's email.</p>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </div>
        </form>
      </Modal>

      <ReactivateUserModal
        isOpen={isReactivateModalOpen}
        onClose={handleCloseReactivateModal}
        onSuccess={handleReactivationSuccess}
        userId={reactivateUserId}
        userEmail={reactivateUserEmail}
      />
    </>
  )
}

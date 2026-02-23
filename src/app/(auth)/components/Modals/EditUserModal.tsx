'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { updateUser } from '@/app/_actions/users'
import { Modal } from './AddUserModal'
import {
	User,
	Mail,
	Phone,
	Building2,
	Shield,
	Calendar,
	AlertCircle,
	ImageIcon,
} from 'lucide-react'

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

export interface EditableUser {
	id: string
	name: string
	email: string
	role: UserRole
	companyName: string | null
	phoneNumber: string | null
	contractEndDate: string | null
	image: string | null
}

interface EditUserModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
	user: EditableUser | null
}

const ROLE_OPTIONS: {
	value: UserRole
	label: string
	description: string
	icon: React.ReactNode
	activeColor: string
}[] = [
	{
		value: 'CLIENT',
		label: 'Client',
		description: 'Can submit and manage their own bookings.',
		icon: <User className="w-4 h-4" />,
		activeColor: 'border-indigo-400 bg-indigo-50 text-indigo-700',
	},
	{
		value: 'ADMIN',
		label: 'Admin',
		description: 'Manages buildings, rooms and approves bookings.',
		icon: <Shield className="w-4 h-4" />,
		activeColor: 'border-blue-400 bg-blue-50 text-blue-700',
	},
	{
		value: 'SUPERADMIN',
		label: 'Super Admin',
		description: 'Full system access including user management.',
		icon: <Shield className="w-4 h-4" />,
		activeColor: 'border-purple-400 bg-purple-50 text-purple-700',
	},
]

const inputClass = (err?: string) =>
	`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${err ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`

const ErrorMsg = ({ msg }: { msg?: string }) =>
	msg ? (
		<p className="flex items-center gap-1 text-xs text-rose-600 mt-1">
			<AlertCircle className="w-3 h-3 flex-shrink-0" /> {msg}
		</p>
	) : null

const formatPhilippinePhone = (value: string): string => {
	const digits = value.replace(/\D/g, '')
	const cleaned = digits.slice(-10)

	if (cleaned.length === 0) return '+63 '
	if (cleaned.length <= 3) return `+63 ${cleaned}`
	if (cleaned.length <= 6) return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
	return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
}

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
	const initialForm = useMemo<UserFormData>(() => {
		if (!user) {
			return {
				name: '',
				email: '',
				role: 'CLIENT',
				companyName: '',
				phoneNumber: '',
				contractEndDate: '',
				image: '',
			}
		}

		return {
			name: user.name,
			email: user.email,
			role: user.role,
			companyName: user.companyName ?? '',
			phoneNumber: user.phoneNumber ? formatPhilippinePhone(user.phoneNumber) : '',
			contractEndDate: user.contractEndDate ? user.contractEndDate.slice(0, 10) : '',
			image: user.image ?? '',
		}
	}, [user])

	const [form, setForm] = useState<UserFormData>(initialForm)
	const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState('')
	const [submitSuccess, setSubmitSuccess] = useState('')

	useEffect(() => {
		if (isOpen) {
			setForm(initialForm)
			setErrors({})
			setSubmitError('')
			setSubmitSuccess('')
		}
	}, [isOpen, initialForm])

	const field = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) =>
		setForm((prev) => ({
			...prev,
			[key]: value,
		}))

	const handleRoleChange = (role: UserRole) => {
		setForm((prev) => ({
			...prev,
			role,
			companyName: role !== 'CLIENT' && !prev.companyName ? 'My GreatWork Spaces' : prev.companyName,
			contractEndDate: role === 'CLIENT' ? prev.contractEndDate : '',
		}))
	}

	const validate = (): boolean => {
		const nextErrors: Partial<Record<keyof UserFormData, string>> = {}

		if (!form.name.trim()) nextErrors.name = 'Full name is required.'
		if (!form.email.trim()) nextErrors.email = 'Email address is required.'
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
			nextErrors.email = 'Enter a valid email address.'
		}

		const phoneDigitsOnly = form.phoneNumber.replace(/\D/g, '')
		if (phoneDigitsOnly.length > 0) {
			const lastTenDigits = phoneDigitsOnly.slice(-10)
			if (lastTenDigits.length !== 10 || lastTenDigits[0] !== '9') {
				nextErrors.phoneNumber = 'Please enter a valid Philippine phone number.'
			}
		}

		setErrors(nextErrors)
		return Object.keys(nextErrors).length === 0
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!user || !validate()) return

		setIsSubmitting(true)
		setSubmitError('')
		setSubmitSuccess('')

		try {
			const result = await updateUser({
				id: user.id,
				name: form.name,
				email: form.email,
				role: form.role,
				companyName: form.companyName,
				phoneNumber: form.phoneNumber,
				contractEndDate: form.role === 'CLIENT' ? form.contractEndDate : '',
				image: form.image,
			})

			if (result.success) {
				setSubmitSuccess('User updated successfully!')

				setTimeout(() => {
					setSubmitSuccess('')
					onClose()
					onSuccess?.()
				}, 1200)
			} else {
				setSubmitError(result.error || 'Failed to update user.')
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
			setSubmitError(message)
		} finally {
			setIsSubmitting(false)
		}
	}

	if (!user) return null

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Edit User"
			description="Update user account details and role."
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
									className={`relative flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
										active ? opt.activeColor : 'border-slate-200 hover:border-slate-300 text-slate-600'
									}`}
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
									<p className="text-xs leading-snug opacity-70">{opt.description}</p>
									{active && (
										<span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current opacity-60" />
									)}
								</label>
							)
						})}
					</div>
				</div>

				<div className="space-y-4">
					<p className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
						Personal Information
					</p>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-slate-700 block mb-1.5">
								Full Name <span className="text-rose-500">*</span>
							</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
								<input
									type="text"
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
										const digitsOnly = e.target.value.replace(/\D/g, '')
										if (digitsOnly.length <= 10) {
											field('phoneNumber', formatPhilippinePhone(e.target.value))
										}
									}}
									maxLength={18}
									className={`${inputClass(errors.phoneNumber)} pl-20`}
								/>
							</div>
							<ErrorMsg msg={errors.phoneNumber} />
						</div>
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1.5">
							Email Address <span className="text-rose-500">*</span>
						</label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="email"
								value={form.email}
								onChange={(e) => field('email', e.target.value)}
								className={`${inputClass(errors.email)} pl-9`}
							/>
						</div>
						<ErrorMsg msg={errors.email} />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1.5">
							Company Name
						</label>
						<div className="relative">
							<Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								value={form.companyName}
								onChange={(e) => field('companyName', e.target.value)}
								className={`${inputClass()} pl-9`}
							/>
						</div>
					</div>

					{form.role === 'CLIENT' && (
						<div>
							<label className="text-sm font-medium text-slate-700 block mb-1.5">
								Contract End Date
								<span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
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
						</div>
					)}

					<div>
						<label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
							<ImageIcon className="w-4 h-4 text-slate-400" />
							Profile Image URL
							<span className="text-xs font-normal text-slate-400">(optional)</span>
						</label>
						<input
							type="url"
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

				<div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
					<Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>
		</Modal>
	)
}

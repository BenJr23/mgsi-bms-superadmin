'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { reactivateUser } from '@/app/_actions/users'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ReactivateUserModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
	userId?: string
	userEmail?: string
}

export function ReactivateUserModal({
	isOpen,
	onClose,
	onSuccess,
	userId,
	userEmail,
}: ReactivateUserModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState('')
	const [successMessage, setSuccessMessage] = useState('')

	const handleReactivate = async () => {
		if (!userId) return

		setIsSubmitting(true)
		setError('')
		setSuccessMessage('')

		try {
			const result = await reactivateUser(userId)

			if (result.success) {
				setSuccessMessage('Account reactivated successfully.')
				setIsSubmitting(false)

				setTimeout(() => {
					setSuccessMessage('')
					onClose()
					onSuccess?.()
				}, 900)
			} else {
				setError(result.error || 'Failed to reactivate user')
				setIsSubmitting(false)
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'An unexpected error occurred'
			setError(message)
			setIsSubmitting(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div
				className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
				style={{
					animation: 'modalIn 0.18s ease-out',
				}}
			>
				<div className="p-6 border-b border-slate-100">
					<div className="flex items-start gap-3">
						<div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
							<RotateCcw className="w-5 h-5 text-amber-600" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-slate-900">Reactivate Account</h2>
							<p className="text-sm text-slate-500 mt-0.5">A matching inactive account was found.</p>
						</div>
					</div>
				</div>

				<div className="px-6 py-5 flex-1">
					<div className="space-y-4">
						<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-amber-700">
								<p className="font-semibold mb-1">Account Already Exists</p>
								<p>
									The email <span className="font-semibold">{userEmail}</span> belongs to a soft-deleted account.
									Would you like to reactivate it?
								</p>
							</div>
						</div>

						{error && (
							<div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
								<AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-rose-700">{error}</p>
							</div>
						)}

						{successMessage && (
							<div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
								<div className="w-4 h-4 bg-emerald-600 rounded-full mt-0.5 flex-shrink-0" />
								<p className="text-sm text-emerald-700">{successMessage}</p>
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isSubmitting}
					>
						No
					</Button>
					<Button
						type="button"
						onClick={handleReactivate}
						disabled={isSubmitting}
						className="bg-amber-600 hover:bg-amber-700 text-white"
					>
						{isSubmitting ? 'Reactivating...' : 'Yes, Reactivate'}
					</Button>
				</div>
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

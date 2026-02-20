'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from './AddRoomModal'
import { deleteRoom } from '@/app/_actions/rooms'

interface DeleteRoomModalProps {
	isOpen: boolean
	onClose: () => void
	roomId?: string
	roomName?: string
	onSuccess?: () => void
}

export function DeleteRoomModal({
	isOpen,
	onClose,
	roomId,
	roomName,
	onSuccess,
}: DeleteRoomModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState('')

	useEffect(() => {
		if (!isOpen) {
			setIsSubmitting(false)
			setSubmitError('')
		}
	}, [isOpen])

	const handleDelete = async () => {
		if (!roomId) {
			setSubmitError('Room not found.')
			return
		}

		setIsSubmitting(true)
		setSubmitError('')

		try {
			const result = await deleteRoom(roomId)
			if (result.success) {
				onClose()
				onSuccess?.()
			} else {
				setSubmitError(result.error || 'Failed to delete room.')
			}
		} catch {
			setSubmitError('An unexpected error occurred while deleting room.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Delete Room"
			description="This action cannot be undone."
			size="sm"
		>
			<div className="space-y-5">
				<div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
					<AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" />
					<p className="text-sm text-rose-700">
						Are you sure you want to delete{' '}
						<span className="font-semibold text-rose-800">
							{roomName || 'this room'}
						</span>
						?
					</p>
				</div>

				{submitError && (
					<div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
						{submitError}
					</div>
				)}

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						onClick={onClose}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="danger"
						onClick={handleDelete}
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Deleting...' : 'Delete Room'}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

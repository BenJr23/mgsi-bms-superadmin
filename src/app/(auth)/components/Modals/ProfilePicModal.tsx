import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { Upload } from 'lucide-react';
import { uploadProfilePicture } from '@/app/_actions/auth';

type ProfilePicModalProps = {
	isOpen: boolean;
	currentImage?: string | null;
	onClose: () => void;
	onUpload: (file: File | null, imageUrl?: string) => Promise<void> | void;
};

export function ProfilePicModal({ isOpen, currentImage, onClose, onUpload }: ProfilePicModalProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!selectedFile) {
			setPreviewUrl(null);
			return;
		}

		const objectUrl = URL.createObjectURL(selectedFile);
		setPreviewUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [selectedFile]);

	const validateFile = (file: File): boolean => {
		setError('');

		if (!file.type.startsWith('image/')) {
			setError('Please select an image file.');
			return false;
		}

		if (file.size > 5 * 1024 * 1024) {
			setError('Please select an image smaller than 5MB.');
			return false;
		}

		return true;
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;

		if (!file) {
			setSelectedFile(null);
			return;
		}

		if (validateFile(file)) {
			setSelectedFile(file);
		} else {
			setSelectedFile(null);
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);

		const file = e.dataTransfer.files?.[0] || null;

		if (!file) return;

		if (validateFile(file)) {
			setSelectedFile(file);
		} else {
			setSelectedFile(null);
		}
	};

	const handleUpload = async () => {
		setError('');

		if (!selectedFile) {
			setError('Choose an image before uploading.');
			return;
		}

		try {
			setIsUploading(true);
			
			// Create FormData for file upload
			const formData = new FormData();
			formData.append('file', selectedFile);

			// Upload via server action
			const result = await uploadProfilePicture(formData);

			if (!result.success) {
				throw new Error(result.error || 'Failed to upload image');
			}

			// Call the parent onUpload callback with the new image URL
			await onUpload(selectedFile, result.image);

			setSelectedFile(null);
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Upload failed.';
			setError(message);
		} finally {
			setIsUploading(false);
		}
	};

	const handleClose = () => {
		setSelectedFile(null);
		setError('');
		onClose();
	};

	if (!isOpen) return null;

	const displayImage = previewUrl || currentImage || null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
			<div className="absolute inset-0 bg-black/50" onClick={handleClose} />
			<div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
				<div className="border-b border-slate-100 px-6 py-4">
					<h3 className="text-lg font-semibold text-slate-900">Update profile picture</h3>
					<p className="text-sm text-slate-500">PNG or JPG up to 5MB.</p>
				</div>

				<div className="px-6 py-6 space-y-5">
					{/* Picture Preview Section */}
					<div className="flex flex-col items-center gap-4">
						<div className="h-24 w-24 rounded-full border-4 border-red-900 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
							{displayImage ?
							<Image
								src={displayImage}
								alt="Profile preview"
								width={96}
								height={96}
								className="h-full w-full object-cover" /> :

							<span className="text-xs text-slate-500 text-center px-2 font-medium">No image</span>
							}
						</div>
					</div>

					{/* Drag and Drop Section */}
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => fileInputRef.current?.click()}
						className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragging ? 'border-red-900 bg-red-50' : 'border-slate-300 bg-slate-50 hover:border-red-800'}`}>
						<Upload className={`w-8 h-8 ${isDragging ? 'text-red-900' : 'text-slate-500'}`} />
						<div className="text-center">
							<p className={`text-sm font-medium ${isDragging ? 'text-red-900' : 'text-slate-700'}`}>Drag and drop your image here</p>
							<p className={`text-xs ${isDragging ? 'text-red-800' : 'text-slate-500'}`}>or click to select a file</p>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleFileChange}
							className="hidden" />
					</div>

					{/* Selected File Display */}
					{selectedFile && (
						<div className="rounded-lg bg-slate-100 border border-slate-300 p-3">
							<p className="text-sm font-medium text-slate-900">Selected file:</p>
							<p className="text-xs text-slate-600 truncate mt-1">{selectedFile.name}</p>
							<p className="text-xs text-slate-600 mt-1">
								{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
							</p>
						</div>
					)}

					{error ?
					<p className="text-sm text-red-600 text-center">{error}</p> :
					null
					}
				</div>

				<div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
						{isUploading ? 'Uploading...' : 'Upload'}
					</Button>
				</div>
			</div>
		</div>
	);
}

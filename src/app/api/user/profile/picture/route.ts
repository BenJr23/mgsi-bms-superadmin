import { requireApiSession } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
	try {
		const { session, errorResponse } = await requireApiSession();
		if (!session?.user?.id) {
			return errorResponse ?? NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const formData = await req.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file
		if (!file.type.startsWith('image/')) {
			return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
		}

		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json({ error: 'File too large' }, { status: 400 });
		}

		const userId = session.user.id;
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!supabaseUrl || !supabaseServiceKey) {
			return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
		}

		// Initialize Supabase client with service role key (for server-side operations)
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Get current user image to delete old one
		const currentUser = await prisma.user.findUnique({
			where: { id: userId },
			select: { image: true }
		});

		// Delete old image if exists
		if (currentUser?.image) {
			try {
				// Extract the path from the full URL
				const pathMatch = currentUser.image.match(/BMS\/.+/);
				if (pathMatch) {
					const { error: deleteError } = await supabase.storage
						.from('BMS')
						.remove([pathMatch[0]]);

					if (deleteError) {
						console.warn('Failed to delete old image:', deleteError);
					}
				}
			} catch (err) {
				console.warn('Error deleting old image:', err);
			}
		}

		// Upload new image
		const fileExt = file.type.split('/')[1];
		const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;

		const buffer = await file.arrayBuffer();
		const uint8Array = new Uint8Array(buffer);

		const { error: uploadError, data: uploadData } = await supabase.storage
			.from('BMS')
			.upload(fileName, uint8Array, {
				contentType: file.type,
				upsert: false
			});

		if (uploadError) {
			console.error('Supabase upload error:', uploadError);
			return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
		}

		// Get public URL
		const { data: publicUrlData } = supabase.storage
			.from('BMS')
			.getPublicUrl(fileName);

		const imageUrl = publicUrlData.publicUrl;

		// Update user image in database
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { image: imageUrl },
			select: {
				id: true,
				image: true,
				name: true,
				email: true,
			}
		});

		return NextResponse.json({
			success: true,
			image: updatedUser.image,
			user: updatedUser
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Upload failed';
		console.error('Profile picture upload error:', err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


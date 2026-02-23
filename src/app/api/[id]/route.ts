import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const { approvalStatus } = await request.json();

    if (!approvalStatus) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    // DIRECT HEADER ACCESS: 
    // This bypasses Next.js async header caching issues
    const session = await auth.api.getSession({
      headers: request.headers, 
    });

    console.log('--- API FINAL DEBUG ---');
    console.log('Booking ID:', bookingId);
    console.log('Session Found:', !!session);
    console.log('Admin User ID:', session?.user?.id ?? 'none');

    if (!session?.user?.id) {
        // If still failing, it's likely a cookie/JWT decryption error
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        approvalStatus,
        updatedById: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
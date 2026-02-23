import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        isActive: true, // Optional: Only show active bookings based on your schema
        deletedAt: null
      },
      include: {
        building: true,     // Fetches the related Building object
        room: true,         // Fetches the related Room object
        submittedBy: true,  // Fetches the related User object
        updatedBy: true,    // Fetch the admin who approved/rejected (if any)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }
}
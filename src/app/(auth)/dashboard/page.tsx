'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { DashboardView } from '../components/DashboardView'

export default function DashboardPage() {
  const router = useRouter()

  return <DashboardView onViewAllBookings={() => router.push('/bookings')} />
}

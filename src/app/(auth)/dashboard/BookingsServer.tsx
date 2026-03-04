import React, { Suspense } from 'react'
import { BookingsClient } from '../components/bookings/BookingsClient'

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
      <p className="text-slate-500">Loading bookings...</p>
    </div>
  )
}

export function BookingsServer() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingsClient />
    </Suspense>
  )
}

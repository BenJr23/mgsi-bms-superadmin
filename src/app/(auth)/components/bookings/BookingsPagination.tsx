import React from 'react'
import { Button } from '../ui/Button'

export function BookingsPagination(props: {
  currentPage: number
  totalPages: number
  totalCount: number
  loading: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing page {props.currentPage} of {props.totalPages} • {props.totalCount} total bookings
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={props.onPrevious}
          disabled={props.currentPage === 1 || props.loading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={props.onNext}
          disabled={props.currentPage >= props.totalPages || props.loading}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

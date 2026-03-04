import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'

export function BookingsViewHeader(props: {
  monthFilter: 'ALL' | string
  onMonthFilterChange: (value: 'ALL' | string) => void
  onExportCSV: () => void
  onExportPDF: () => void
  onOpenWalkIn: () => void
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="text-slate-500">Manage and approve booking requests.</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex items-center gap-3">
          <label className="text-sm text-slate-500">Month:</label>
          <input
            type="month"
            value={props.monthFilter === 'ALL' ? '' : props.monthFilter}
            onChange={(e) => props.onMonthFilterChange(e.target.value ? e.target.value : 'ALL')}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm"
          />
          <Button variant="outline" onClick={props.onExportCSV} title="Export CSV">
            Export CSV
          </Button>
          <Button onClick={props.onExportPDF} className="ml-2">
            Export PDF
          </Button>
        </div>
        <Button onClick={props.onOpenWalkIn} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Walk-In Booking
        </Button>
      </div>
    </header>
  )
}

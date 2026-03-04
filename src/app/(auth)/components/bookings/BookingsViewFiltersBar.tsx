import React from 'react'
import { Filter, Search } from 'lucide-react'
import { Button } from '../ui/Button'

export function BookingsViewFiltersBar(props: {
  query: string
  onQueryChange: (value: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  onStatusFilterChange: (value: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => void
  onCloseFilters: () => void
}) {
  return (
    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
          type="text"
          placeholder="Search bookings..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={props.onToggleFilters}
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>

        {props.showFilters && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-md z-10 p-3">
            <div className="text-sm text-slate-600 mb-2">Status</div>
            <ul className="space-y-1">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                <li key={s}>
                  <button
                    onClick={() => {
                      props.onStatusFilterChange(s)
                    }}
                    className={`w-full text-left text-sm py-1 px-2 rounded ${
                      props.statusFilter === s ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 pt-2 border-t border-slate-100">
              <button
                onClick={props.onCloseFilters}
                className="w-full text-xs text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

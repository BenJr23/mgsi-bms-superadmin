import React from 'react'
import { Filter, Search } from 'lucide-react'
import { Button } from '../ui/Button'

export function BookingsViewFiltersBar(props: {
  query: string
  onQueryChange: (value: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  statusFilter: 'ALL' | 'RESCHEDULED' | 'CONFIRMED'
  onStatusFilterChange: (value: 'ALL' | 'RESCHEDULED' | 'CONFIRMED') => void
  onCloseFilters: () => void
  companyFilter: string
  buildingFilter: string
  roomFilter: string
  availableCompanies: string[]
  availableBuildings: { id: string; name: string }[]
  availableRooms: { id: string; name: string }[]
  onCompanyFilterChange: (value: string) => void
  onBuildingFilterChange: (value: string) => void
  onRoomFilterChange: (value: string) => void
  onClearFilters: () => void
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
          <div className="fixed right-4 top-20 w-56 bg-white border border-slate-200 rounded-md shadow-md z-50 p-3">
            <div className="text-sm text-slate-600 mb-2">Status</div>
            <ul className="space-y-1">
              {(['ALL', 'RESCHEDULED', 'CONFIRMED'] as const).map((s) => (
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
              <div className="text-sm text-slate-600 mb-2">Company</div>
              <select
                value={props.companyFilter}
                onChange={(e) => props.onCompanyFilterChange(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1"
              >
                <option value="ALL">All Companies</option>
                {props.availableCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100">
              <div className="text-sm text-slate-600 mb-2">Building</div>
              <select
                value={props.buildingFilter}
                onChange={(e) => props.onBuildingFilterChange(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1"
              >
                <option value="ALL">All Buildings</option>
                {props.availableBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100">
              <div className="text-sm text-slate-600 mb-2">Room</div>
              <select
                value={props.roomFilter}
                onChange={(e) => props.onRoomFilterChange(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1"
                disabled={props.buildingFilter === 'ALL'}
              >
                <option value="ALL">All Rooms</option>
                {props.availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex gap-2">
              <button
                onClick={props.onClearFilters}
                className="flex-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
              >
                Clear Filters
              </button>
              <button
                onClick={props.onCloseFilters}
                className="flex-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
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

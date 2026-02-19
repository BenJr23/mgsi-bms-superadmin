import React, { useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { AddRoomModal } from './Modals/AddRoomModal'
import { Search, Filter, Users, Wifi, Monitor, Coffee } from 'lucide-react'
type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
export function RoomsView() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const rooms = [
    {
      id: 1,
      name: 'Conference Room A',
      code: 'RM-101',
      building: 'Innovation Hub',
      capacity: 12,
      status: 'AVAILABLE',
      amenities: ['wifi', 'screen', 'coffee'],
    },
    {
      id: 2,
      name: 'Auditorium',
      code: 'RM-102',
      building: 'Innovation Hub',
      capacity: 200,
      status: 'OCCUPIED',
      amenities: ['wifi', 'screen', 'mic'],
    },
    {
      id: 3,
      name: 'Huddle Room 1',
      code: 'RM-201',
      building: 'Downtown Center',
      capacity: 4,
      status: 'AVAILABLE',
      amenities: ['wifi', 'whiteboard'],
    },
    {
      id: 4,
      name: 'Executive Suite',
      code: 'RM-505',
      building: 'Executive Tower',
      capacity: 8,
      status: 'MAINTENANCE',
      amenities: ['wifi', 'screen', 'coffee', 'video'],
    },
    {
      id: 5,
      name: 'Training Lab',
      code: 'RM-303',
      building: 'West Wing Annex',
      capacity: 30,
      status: 'INACTIVE',
      amenities: ['wifi', 'computers'],
    },
  ]
  const openModal = () => {
    setIsModalOpen(true)
  }
  const closeModal = () => {
    setIsModalOpen(false)
  }
  const renderAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'wifi':
        return <Wifi className="w-3 h-3" />
      case 'screen':
        return <Monitor className="w-3 h-3" />
      case 'coffee':
        return <Coffee className="w-3 h-3" />
      default:
        return null
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
          <p className="text-slate-500">
            Manage individual rooms and their amenities.
          </p>
        </div>
        <Button onClick={openModal}>+ Add Room</Button>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search rooms..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Filter className="w-4 h-4" />
            Filter by Building
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Room Name</th>
                <th className="px-6 py-3">Building</th>
                <th className="px-6 py-3">Capacity</th>
                <th className="px-6 py-3">Amenities</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <tr
                  key={room.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {room.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {room.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{room.building}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Users className="w-3 h-3" />
                      <span>{room.capacity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {room.amenities.slice(0, 3).map((a, i) => (
                        <span
                          key={i}
                          className="p-1 bg-slate-100 rounded text-slate-500"
                          title={a}
                        >
                          {renderAmenityIcon(a)}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-xs text-slate-400 flex items-center">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        room.status === 'AVAILABLE'
                          ? 'success'
                          : room.status === 'OCCUPIED'
                            ? 'warning'
                            : room.status === 'MAINTENANCE'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {room.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddRoomModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  )
}

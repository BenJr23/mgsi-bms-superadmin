'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { AddRoomModal } from './Modals/AddRoomModal'
import { EditRoomModal } from './Modals/EditRoomModal'
import { DeleteRoomModal } from './Modals/DeleteRoomModal'
import {
  Search,
  Users,
  Wifi,
  Monitor,
  Coffee,
  Presentation,
  Video,
  Mic,
  PcCase,
  Wind,
} from 'lucide-react'
import { getAllRooms } from '@/app/_actions/rooms'
import { getBuildings } from '@/app/_actions/buildings'

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'

interface Room {
  id: string
  roomName: string
  roomCode: string | null
  capacity: number
  status: RoomStatus
  amenities: string[] | null
  building: {
    id: string
    buildingName: string
  }
}

interface Building {
  id: string
  buildingName: string
}

export function RoomsView() {
  const ITEMS_PER_PAGE = 6
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>()
  const [selectedDeleteRoomId, setSelectedDeleteRoomId] = useState<
    string | undefined
  >()
  const [selectedDeleteRoomName, setSelectedDeleteRoomName] = useState<
    string | undefined
  >()
  const [rooms, setRooms] = useState<Room[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRooms = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAllRooms({
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        searchQuery,
        buildingId: selectedBuilding || undefined,
      })

      if (result.success && result.data) {
        setRooms(result.data.rooms)
        setTotalItems(result.data.pagination.totalItems)
        setTotalPages(result.data.pagination.totalPages)
      } else {
        setError(result.error || 'Failed to load rooms')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadBuildingOptions = async () => {
      const result = await getBuildings()
      if (result.success && result.data) {
        setBuildings(result.data)
      }
    }

    void loadBuildingOptions()
  }, [])

  useEffect(() => {
    void loadRooms()
  }, [currentPage, searchQuery, selectedBuilding])

  const handleAddRoomSuccess = () => {
    void loadRooms()
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedBuilding])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const openEditModal = (roomId: string) => {
    setSelectedRoomId(roomId)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedRoomId(undefined)
  }

  const openDeleteModal = (roomId: string, roomName: string) => {
    setSelectedDeleteRoomId(roomId)
    setSelectedDeleteRoomName(roomName)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setSelectedDeleteRoomId(undefined)
    setSelectedDeleteRoomName(undefined)
  }

  const renderAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'wifi':
        return <Wifi className="w-3 h-3" />
      case 'screen':
        return <Monitor className="w-3 h-3" />
      case 'whiteboard':
        return <Presentation className="w-3 h-3" />
      case 'coffee':
        return <Coffee className="w-3 h-3" />
      case 'video':
        return <Video className="w-3 h-3" />
      case 'mic':
        return <Mic className="w-3 h-3" />
      case 'computers':
        return <PcCase className="w-3 h-3" />
      case 'aircon':
        return <Wind className="w-3 h-3" />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
          <p className="text-slate-500">
            Manage individual rooms and their amenities.
          </p>
        </div>
        <div className="text-center text-slate-500">Loading rooms...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
          <p className="text-slate-500">
            Manage individual rooms and their amenities.
          </p>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      </div>
    )
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-auto"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.buildingName}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:block overflow-x-auto">
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
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {room.roomName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {room.roomCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {room.building.buildingName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3 h-3" />
                        <span>{room.capacity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {room.amenities && room.amenities.length > 0 ? (
                          <>
                            {(typeof room.amenities === 'string'
                              ? JSON.parse(room.amenities)
                              : room.amenities
                            )
                              .slice(0, 3)
                              .map((a: string, i: number) => (
                                <span
                                  key={i}
                                  className="p-1 bg-slate-100 rounded text-slate-500"
                                  title={a}
                                >
                                  {renderAmenityIcon(a)}
                                </span>
                              ))}
                            {(typeof room.amenities === 'string'
                              ? JSON.parse(room.amenities)
                              : room.amenities
                            ).length > 3 && (
                              <span className="text-xs text-slate-400 flex items-center">
                                +
                                {(typeof room.amenities === 'string'
                                  ? JSON.parse(room.amenities)
                                  : room.amenities
                                ).length - 3}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(room.id)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                        >
                          Edit
                        </button>
                        <span className="text-slate-400 text-xs">/</span>
                        <button
                          onClick={() => openDeleteModal(room.id, room.roomName)}
                          className="text-rose-600 hover:text-rose-800 font-medium text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No rooms found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <div key={room.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 mb-1">{room.roomName}</div>
                    <div className="text-xs text-slate-500 font-mono">{room.roomCode}</div>
                  </div>
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
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Building:</span>
                    <span className="text-slate-900">{room.building.buildingName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Capacity:</span>
                    <div className="flex items-center gap-1 text-slate-900">
                      <Users className="w-3 h-3" />
                      <span>{room.capacity}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">Amenities:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                      {room.amenities && room.amenities.length > 0 ? (
                        (typeof room.amenities === 'string'
                          ? JSON.parse(room.amenities)
                          : room.amenities
                        ).map((a: string, i: number) => (
                          <span
                            key={i}
                            className="p-1 bg-slate-100 rounded text-slate-500"
                            title={a}
                          >
                            {renderAmenityIcon(a)}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEditModal(room.id)}
                    className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium"
                  >
                    Edit Room
                  </button>
                  <button
                    onClick={() => openDeleteModal(room.id, room.roomName)}
                    className="w-full px-4 py-2 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors text-sm font-medium"
                  >
                    Delete Room
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              No rooms found
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <span className="text-xs text-slate-500">
              Showing {startItem}-{endItem} of {totalItems}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AddRoomModal isOpen={isModalOpen} onClose={closeModal} onSuccess={handleAddRoomSuccess} />

      <EditRoomModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        roomId={selectedRoomId}
        onSuccess={handleAddRoomSuccess}
      />

      <DeleteRoomModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        roomId={selectedDeleteRoomId}
        roomName={selectedDeleteRoomName}
        onSuccess={handleAddRoomSuccess}
      />
    </div>
  )
}

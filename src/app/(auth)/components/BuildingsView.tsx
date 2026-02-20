'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { AddBuildingModal } from './Modals/AddBuildingModal'
import { EditBuildingModal } from './Modals/EditBuildingModal'
import { MapPin, Building, MoreVertical } from 'lucide-react'
import { getAllBuildings } from '@/app/_actions/buildings'

export function BuildingsView() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>()
  const [buildings, setBuildings] = useState<Array<{
    id: string
    buildingName: string
    buildingCode: string
    address: string | null
    imageUrl: string | null
    status: string
    roomCount: number
    createdAt: Date
  }>>([]);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBuildings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAllBuildings()
      if (result.success) {
        setBuildings(result.data ?? [])
      } else {
        setError(result.error || 'Failed to load buildings')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadBuildings()
  }, [])

  const handleAddBuildingSuccess = () => {
    void loadBuildings()
  }

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const openEditModal = (buildingId: string) => {
    setSelectedBuildingId(buildingId)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedBuildingId(undefined)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buildings</h1>
          <p className="text-slate-500">Manage your properties and facilities.</p>
        </div>
        <div className="text-center text-slate-500">Loading buildings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buildings</h1>
          <p className="text-slate-500">Manage your properties and facilities.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Buildings</h1>
          <p className="text-slate-500">
            Manage your properties and facilities.
          </p>
        </div>
        <Button onClick={openModal}>+ Add Building</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.length > 0 ? (
          buildings.map((building) => (
            <Card
              key={building.id}
              noPadding
              className="group hover:shadow-md transition-shadow"
            >
              <div className="relative h-48 overflow-hidden bg-slate-200">
                <img
                  src={building.imageUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'}
                  alt={building.buildingName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'
                  }}
                />
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={
                      building.status === 'ACTIVE'
                        ? 'success'
                        : building.status === 'MAINTENANCE'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {building.status}
                  </Badge>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {building.buildingName}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">
                      {building.buildingCode}
                    </p>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 mt-4">
                  {building.address && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                      <span>{building.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{building.roomCount} Rooms available</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    {building.createdAt && 
                      `Created ${new Date(building.createdAt).toLocaleDateString()}`
                    }
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(building.id)}
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-500">No buildings found</p>
          </div>
        )}

        {/* Add New Placeholder */}
        <button
          onClick={openModal}
          className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all min-h-[300px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Building className="w-6 h-6" />
          </div>
          <span className="font-medium">Add New Building</span>
        </button>
      </div>

      {/* Add Building Modal */}
      <AddBuildingModal isOpen={isModalOpen} onClose={closeModal} onSuccess={handleAddBuildingSuccess} />

      {/* Edit Building Modal */}
      <EditBuildingModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        buildingId={selectedBuildingId}
        onSuccess={handleAddBuildingSuccess}
      />
    </div>
  )
}

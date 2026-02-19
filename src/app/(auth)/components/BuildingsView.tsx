import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AddBuildingModal } from './Modals/AddBuildingModal';
import { MapPin, Building, MoreVertical } from 'lucide-react'

export function BuildingsView() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buildings = [
    {
      id: 1,
      name: 'Innovation Hub',
      code: 'BLD-001',
      status: 'ACTIVE',
      rooms: 42,
      address: '123 Tech Blvd, Silicon Valley',
      image:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 2,
      name: 'Downtown Center',
      code: 'BLD-002',
      status: 'ACTIVE',
      rooms: 28,
      address: '45 Main St, Downtown',
      image:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 3,
      name: 'West Wing Annex',
      code: 'BLD-003',
      status: 'MAINTENANCE',
      rooms: 15,
      address: '789 West Ave, Business District',
      image:
        'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 4,
      name: 'Creative Lofts',
      code: 'BLD-004',
      status: 'INACTIVE',
      rooms: 12,
      address: '101 Art Way, Design District',
      image:
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 5,
      name: 'Executive Tower',
      code: 'BLD-005',
      status: 'ACTIVE',
      rooms: 56,
      address: '500 Corporate Dr, Financial District',
      image:
        'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80&w=800',
    },
  ]

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
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
        {buildings.map((building) => (
          <Card
            key={building.id}
            noPadding
            className="group hover:shadow-md transition-shadow"
          >
            <div className="relative h-48 overflow-hidden bg-slate-200">
              <img
                src={building.image}
                alt={building.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                    {building.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {building.code}
                  </p>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                  <span>{building.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>{building.rooms} Rooms available</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Last updated 2 days ago
                </span>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        ))}

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
      <AddBuildingModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Loader2, X } from 'lucide-react';
import { createWalkInBooking, getBuildings, getRoomsByBuilding, type Building, type Room } from '@/app/_actions/bookings';

interface WalkInBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WalkInBookingModal({ isOpen, onClose, onSuccess }: WalkInBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBuildings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBuildingId) {
      fetchRooms(selectedBuildingId);
    } else {
      setRooms([]);
    }
  }, [selectedBuildingId]);

  const fetchBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const result = await getBuildings();
      if (result.success && result.data) {
        setBuildings(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch buildings:', err);
    } finally {
      setLoadingBuildings(false);
    }
  };

  const fetchRooms = async (buildingId: string) => {
    setLoadingRooms(true);
    try {
      const result = await getRoomsByBuilding({ buildingId });
      if (result.success && result.data) {
        setRooms(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      buildingId: formData.get('buildingId') as string,
      roomId: formData.get('roomId') as string,
      startDate: new Date(formData.get('startDate') as string),
      endDate: new Date(formData.get('endDate') as string),
      attendeeCount: parseInt(formData.get('attendeeCount') as string),
    };

    try {
      const result = await createWalkInBooking(data);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to create walk-in booking');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const buildingId = e.target.value;
    setSelectedBuildingId(buildingId);
    // Clear room selection when building changes
    if (e.target.form) {
      const roomSelect = e.target.form.elements.namedItem('roomId') as HTMLSelectElement;
      if (roomSelect) roomSelect.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">New Walk-In Booking</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 text-sm text-rose-600 bg-rose-50 rounded-md border border-rose-200">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Client Name</label>
              <input name="name" required className="w-full p-2 text-sm border rounded-md" placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Client Email</label>
              <input name="email" type="email" required className="w-full p-2 text-sm border rounded-md" placeholder="john@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Building</label>
              <select 
                name="buildingId" 
                required 
                className="w-full p-2 text-sm border rounded-md"
                onChange={handleBuildingChange}
                disabled={loadingBuildings}
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.buildingName} ({building.buildingCode})
                  </option>
                ))}
              </select>
              {loadingBuildings && (
                <div className="text-xs text-slate-500">Loading buildings...</div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Room</label>
              <select 
                name="roomId" 
                required 
                className="w-full p-2 text-sm border rounded-md"
                disabled={!selectedBuildingId || loadingRooms}
              >
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomName} {room.roomCode && `(${room.roomCode})`} - Capacity: {room.capacity}
                  </option>
                ))}
              </select>
              {loadingRooms && (
                <div className="text-xs text-slate-500">Loading rooms...</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date & Time</label>
              <input name="startDate" type="datetime-local" required className="w-full p-2 text-sm border rounded-md" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date & Time</label>
              <input name="endDate" type="datetime-local" required className="w-full p-2 text-sm border rounded-md" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Attendees</label>
            <input name="attendeeCount" type="number" defaultValue={1} min={1} required className="w-full p-2 text-sm border rounded-md" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create & Approve Booking
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader, AlertCircle, X, BedDouble } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../../services/api';

const categoryColors = {
  standard: 'bg-blue-100 text-blue-800',
  deluxe: 'bg-purple-100 text-purple-800',
  family: 'bg-green-100 text-green-800',
};

const statusColors = {
  available: 'bg-green-100 text-green-800',
  maintenance: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  room_number: '',
  category: 'standard',
  floor: '',
  description: '',
  amenities: '',
  capacity: 2,
  status: 'available',
};

function RoomModal({ room, onClose, onSave }) {
  const [form, setForm] = useState(room ? {
    room_number: room.room_number,
    category: room.category,
    floor: room.floor,
    description: room.description || '',
    amenities: room.amenities || '',
    capacity: room.capacity || 2,
    status: room.status,
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.room_number.trim()) errs.room_number = 'Room number is required';
    if (!form.floor) errs.floor = 'Floor is required';
    if (!form.capacity || form.capacity < 1) errs.capacity = 'Capacity must be at least 1';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      if (room) {
        await updateRoom(room.id, form);
      } else {
        await createRoom(form);
      }
      onSave();
      onClose();
    } catch (err) {
      setApiError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-navy-900">{room ? 'Edit Room' : 'Add New Room'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {apiError && (
            <div className="bg-red-50 text-red-700 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {apiError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Room Number *</label>
              <input
                type="text"
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                className={`form-input ${errors.room_number ? 'border-red-400' : ''}`}
                placeholder="101"
              />
              {errors.room_number && <p className="text-red-500 text-xs mt-1">{errors.room_number}</p>}
            </div>
            <div>
              <label className="form-label">Floor *</label>
              <input
                type="number"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                className={`form-input ${errors.floor ? 'border-red-400' : ''}`}
                placeholder="1"
                min="1"
              />
              {errors.floor && <p className="text-red-500 text-xs mt-1">{errors.floor}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="form-input"
              >
                <option value="standard">Standard</option>
                <option value="deluxe">Deluxe</option>
                <option value="family">Family Suite</option>
              </select>
            </div>
            <div>
              <label className="form-label">Max Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                className={`form-input ${errors.capacity ? 'border-red-400' : ''}`}
                min="1"
                max="10"
              />
              {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="form-input"
            >
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-input resize-none"
              rows={3}
              placeholder="Room description..."
            />
          </div>

          <div>
            <label className="form-label">Amenities (comma-separated)</label>
            <input
              type="text"
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              className="form-input"
              placeholder="WiFi, TV, Air Conditioning, Mini Bar"
            />
            <p className="text-xs text-gray-400 mt-1">Separate amenities with commas</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : (room ? 'Update Room' : 'Create Room')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoomsAdmin() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRooms = async () => {
    try {
      const res = await getRooms();
      setRooms(res.data);
    } catch (err) {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDelete = async (room) => {
    if (!window.confirm(`Are you sure you want to delete Room ${room.room_number}? This action cannot be undone.`)) return;
    setDeletingId(room.id);
    try {
      await deleteRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete room');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Rooms Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">{rooms.length} rooms total</p>
          </div>
          <button
            onClick={() => { setEditingRoom(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>

        <div className="p-8">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-navy-900 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {rooms.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No rooms found</p>
                  <p className="text-sm mt-1">Add your first room to get started</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Room</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Floor</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Base Rate</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-navy-900">Room {room.room_number}</div>
                          {room.description && (
                            <div className="text-gray-400 text-xs mt-0.5 max-w-xs truncate">{room.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryColors[room.category] || 'bg-gray-100 text-gray-800'}`}>
                            {room.category.charAt(0).toUpperCase() + room.category.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{room.floor}</td>
                        <td className="px-6 py-4 text-gray-700">{room.capacity} guests</td>
                        <td className="px-6 py-4">
                          {room.base_price ? (
                            <div>
                              <div className="font-medium text-navy-900">₹{room.base_price}</div>
                              <div className="text-xs text-gray-400">Weekend: ₹{room.base_weekend_price}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[room.status] || 'bg-gray-100 text-gray-800'}`}>
                            {room.status === 'available' ? 'Available' : 'Maintenance'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingRoom(room); setShowModal(true); }}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(room)}
                              disabled={deletingId === room.id}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === room.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <RoomModal
          room={editingRoom}
          onClose={() => { setShowModal(false); setEditingRoom(null); }}
          onSave={fetchRooms}
        />
      )}
    </div>
  );
}

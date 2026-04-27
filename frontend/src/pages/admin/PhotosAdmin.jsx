import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Star, Loader, AlertCircle, ImageOff, X } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getRooms, getRoomPhotos, uploadPhoto, deletePhoto, setPrimaryPhoto, UPLOADS_BASE } from '../../services/api';

export default function PhotosAdmin() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await getRooms();
        setRooms(res.data);
        if (res.data.length > 0) setSelectedRoomId(res.data[0].id.toString());
      } catch (err) {
        setError('Failed to load rooms');
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchPhotos();
    }
  }, [selectedRoomId]);

  const fetchPhotos = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getRoomPhotos(selectedRoomId);
      setPhotos(res.data);
    } catch (err) {
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (!selectedRoomId) {
      setError('Please select a room first');
      return;
    }

    setUploading(true);
    setError(null);
    let uploaded = 0;

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      const formData = new FormData();
      formData.append('photo', file);
      try {
        await uploadPhoto(selectedRoomId, formData);
        uploaded++;
      } catch (err) {
        setError(err.response?.data?.error || `Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    if (uploaded > 0) {
      setSuccessMsg(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchPhotos();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this photo permanently?')) return;
    setDeletingId(photo.id);
    try {
      await deletePhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setSuccessMsg('Photo deleted');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      setError('Failed to delete photo');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (photo) => {
    setSettingPrimaryId(photo.id);
    try {
      await setPrimaryPhoto(photo.id);
      setPhotos((prev) => prev.map((p) => ({ ...p, is_primary: p.id === photo.id ? 1 : 0 })));
      setSuccessMsg('Primary photo updated');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      setError('Failed to set primary photo');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const selectedRoom = rooms.find((r) => r.id.toString() === selectedRoomId);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-bold text-navy-900">Photo Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload and manage room photos</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {successMsg}
            </div>
          )}

          {/* Room Selector & Upload */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="form-label">Select Room</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="form-input"
                >
                  <option value="">-- Select a Room --</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number} — {room.category.charAt(0).toUpperCase() + room.category.slice(1)} (Floor {room.floor})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className={`flex items-center gap-2 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer text-sm ${
                    !selectedRoomId || uploading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gold-500 hover:bg-gold-600 text-white shadow-md'
                  }`}
                  onClick={(e) => { if (!selectedRoomId || uploading) e.preventDefault(); }}
                >
                  {uploading ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload Photos</>
                  )}
                </label>
              </div>
            </div>

            {selectedRoom && (
              <div className="mt-3 text-sm text-gray-500">
                Showing photos for: <span className="font-medium text-navy-900">Room {selectedRoom.room_number}</span>
                <span className="text-gray-400"> — {photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Photo Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-navy-900 animate-spin" />
            </div>
          ) : !selectedRoomId ? (
            <div className="text-center py-16 text-gray-400">
              <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Select a room to manage its photos</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ImageOff className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-gray-500 font-medium mb-1">No photos yet</h3>
              <p className="text-gray-400 text-sm">Upload photos for Room {selectedRoom?.room_number}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="relative aspect-square">
                    <img
                      src={`${UPLOADS_BASE}/${photo.filename}`}
                      alt="Room photo"
                      className="w-full h-full object-cover"
                    />

                    {/* Primary Badge */}
                    {photo.is_primary === 1 && (
                      <div className="absolute top-2 left-2 bg-gold-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                        <Star className="w-3 h-3 fill-white" />
                        Primary
                      </div>
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {photo.is_primary !== 1 && (
                        <button
                          onClick={() => handleSetPrimary(photo)}
                          disabled={settingPrimaryId === photo.id}
                          className="p-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl transition-colors disabled:opacity-50"
                          title="Set as primary"
                        >
                          {settingPrimaryId === photo.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(photo)}
                        disabled={deletingId === photo.id}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50"
                        title="Delete photo"
                      >
                        {deletingId === photo.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5">
                    <div className="text-xs text-gray-500 truncate">{photo.filename}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(photo.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload Card */}
              <label
                htmlFor="photo-upload"
                className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-all text-gray-400 hover:text-gold-600"
              >
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Add Photos</span>
              </label>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader, AlertCircle, IndianRupee, X } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getBaseRates, updateBaseRate, getRates, createRate, deleteRate, getRooms } from '../../services/api';

const categoryLabels = { standard: 'Standard', deluxe: 'Deluxe', family: 'Family Suite' };
const categoryColors = {
  standard: 'bg-blue-100 text-blue-800',
  deluxe: 'bg-purple-100 text-purple-800',
  family: 'bg-green-100 text-green-800',
};

export default function RatesAdmin() {
  const [baseRates, setBaseRates] = useState([]);
  const [rates, setRates] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [editingRates, setEditingRates] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const [newRate, setNewRate] = useState({ room_id: '', date: '', price: '' });
  const [addingRate, setAddingRate] = useState(false);
  const [newRateErrors, setNewRateErrors] = useState({});
  const [deletingRateId, setDeletingRateId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [baseRes, ratesRes, roomsRes] = await Promise.all([
          getBaseRates(),
          getRates(),
          getRooms(),
        ]);
        setBaseRates(baseRes.data);
        setRates(ratesRes.data);
        setRooms(roomsRes.data);

        const initial = {};
        baseRes.data.forEach((r) => {
          initial[r.category] = { price: r.price, weekend_price: r.weekend_price };
        });
        setEditingRates(initial);
      } catch (err) {
        setError('Failed to load rates');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveBaseRate = async (category) => {
    const vals = editingRates[category];
    if (!vals?.price || !vals?.weekend_price) return;
    setSaving(category);
    try {
      await updateBaseRate(category, { price: parseFloat(vals.price), weekend_price: parseFloat(vals.weekend_price) });
      const res = await getBaseRates();
      setBaseRates(res.data);
      setSuccessMsg(`${categoryLabels[category]} base rate updated!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update rate');
    } finally {
      setSaving(null);
    }
  };

  const validateNewRate = () => {
    const errs = {};
    if (!newRate.room_id) errs.room_id = 'Select a room';
    if (!newRate.date) errs.date = 'Date is required';
    if (!newRate.price || parseFloat(newRate.price) <= 0) errs.price = 'Valid price required';
    return errs;
  };

  const handleAddRate = async (e) => {
    e.preventDefault();
    const errs = validateNewRate();
    if (Object.keys(errs).length > 0) {
      setNewRateErrors(errs);
      return;
    }
    setAddingRate(true);
    try {
      await createRate({ room_id: parseInt(newRate.room_id), date: newRate.date, price: parseFloat(newRate.price) });
      const res = await getRates();
      setRates(res.data);
      setNewRate({ room_id: '', date: '', price: '' });
      setNewRateErrors({});
      setSuccessMsg('Rate override added!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setNewRateErrors({ general: err.response?.data?.error || 'Failed to add rate' });
    } finally {
      setAddingRate(false);
    }
  };

  const handleDeleteRate = async (id) => {
    if (!window.confirm('Delete this rate override?')) return;
    setDeletingRateId(id);
    try {
      await deleteRate(id);
      setRates((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('Failed to delete rate');
    } finally {
      setDeletingRateId(null);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-bold text-navy-900">Rates Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage base rates and date-specific price overrides</p>
        </div>

        <div className="p-8 space-y-8">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-navy-900 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
              {successMsg}
            </div>
          )}

          {!loading && (
            <>
              {/* Base Rates */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-navy-900">Base Rates by Category</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Default nightly rates applied when no specific override exists</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {baseRates.map((rate) => (
                    <div key={rate.category} className="border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[rate.category]}`}>
                          {categoryLabels[rate.category]}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Weekday Rate</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={editingRates[rate.category]?.price ?? rate.price}
                              onChange={(e) => setEditingRates((prev) => ({
                                ...prev,
                                [rate.category]: { ...prev[rate.category], price: e.target.value },
                              }))}
                              className="form-input pl-8 text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Weekend Rate (Fri-Sat)</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={editingRates[rate.category]?.weekend_price ?? rate.weekend_price}
                              onChange={(e) => setEditingRates((prev) => ({
                                ...prev,
                                [rate.category]: { ...prev[rate.category], weekend_price: e.target.value },
                              }))}
                              className="form-input pl-8 text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveBaseRate(rate.category)}
                          disabled={saving === rate.category}
                          className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {saving === rate.category ? (
                            <><Loader className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="w-3.5 h-3.5" /> Save Rate</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Override */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-navy-900">Add Date Override</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Set a specific price for a room on a particular date</p>
                </div>
                <form onSubmit={handleAddRate} className="p-6">
                  {newRateErrors.general && (
                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{newRateErrors.general}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="form-label">Room</label>
                      <select
                        value={newRate.room_id}
                        onChange={(e) => { setNewRate({ ...newRate, room_id: e.target.value }); setNewRateErrors((p) => ({ ...p, room_id: '' })); }}
                        className={`form-input text-sm ${newRateErrors.room_id ? 'border-red-400' : ''}`}
                      >
                        <option value="">Select Room</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            Room {room.room_number} ({room.category})
                          </option>
                        ))}
                      </select>
                      {newRateErrors.room_id && <p className="text-red-500 text-xs mt-1">{newRateErrors.room_id}</p>}
                    </div>
                    <div>
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        value={newRate.date}
                        min={today}
                        onChange={(e) => { setNewRate({ ...newRate, date: e.target.value }); setNewRateErrors((p) => ({ ...p, date: '' })); }}
                        className={`form-input text-sm ${newRateErrors.date ? 'border-red-400' : ''}`}
                      />
                      {newRateErrors.date && <p className="text-red-500 text-xs mt-1">{newRateErrors.date}</p>}
                    </div>
                    <div>
                      <label className="form-label">Price per Night</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={newRate.price}
                          onChange={(e) => { setNewRate({ ...newRate, price: e.target.value }); setNewRateErrors((p) => ({ ...p, price: '' })); }}
                          className={`form-input pl-8 text-sm ${newRateErrors.price ? 'border-red-400' : ''}`}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      {newRateErrors.price && <p className="text-red-500 text-xs mt-1">{newRateErrors.price}</p>}
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={addingRate}
                        className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm"
                      >
                        {addingRate ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Override
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Override List */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-navy-900">Date-Specific Overrides</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{rates.length} override{rates.length !== 1 ? 's' : ''} active</p>
                  </div>
                </div>

                {rates.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No rate overrides set</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Room</th>
                        <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rates.map((rate) => (
                        <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-navy-900">Room {rate.room_number}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[rate.category] || 'bg-gray-100 text-gray-800'}`}>
                              {rate.category}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-700">{formatDate(rate.date)}</td>
                          <td className="px-6 py-3 font-semibold text-navy-900">₹{rate.price}</td>
                          <td className="px-6 py-3">
                            <button
                              onClick={() => handleDeleteRate(rate.id)}
                              disabled={deletingRateId === rate.id}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingRateId === rate.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

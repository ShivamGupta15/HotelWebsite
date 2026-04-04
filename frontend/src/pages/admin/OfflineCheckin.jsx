import { useState, useEffect } from 'react';
import {
  UserCheck, BedDouble, Loader, AlertCircle, CheckCircle,
  IndianRupee, Calendar, Users, Phone, User, X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../services/api';

const categoryColors = {
  standard: 'bg-blue-100 text-blue-800',
  deluxe: 'bg-purple-100 text-purple-800',
  family: 'bg-green-100 text-green-800',
};

const statusColors = {
  checked_in:  'bg-green-100 text-green-800',
  confirmed:   'bg-blue-100 text-blue-800',
  checked_out: 'bg-gray-100 text-gray-700',
  cancelled:   'bg-red-100 text-red-700',
};

export default function OfflineCheckin() {
  const [rooms, setRooms] = useState([]);
  const [baseRates, setBaseRates] = useState({});
  const [offlineBookings, setOfflineBookings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    guest_name: '', guest_phone: '', guest_email: '',
    room_id: '', check_in: '', check_out: '', rate_per_night: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [serverError, setServerError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      const [ratesRes, bookingsRes] = await Promise.all([
        api.get('/admin/offline-rates'),
        api.get('/admin/offline-bookings'),
      ]);
      setRooms(ratesRes.data.rooms);
      const rateMap = {};
      ratesRes.data.rates.forEach((r) => { rateMap[r.category] = r; });
      setBaseRates(rateMap);
      setOfflineBookings(bookingsRes.data);
    } catch {
      // silently fail
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-fill rate when room changes
  const handleRoomChange = (roomId) => {
    const room = rooms.find((r) => r.id.toString() === roomId);
    const rate = room ? baseRates[room.category]?.price || '' : '';
    setForm((p) => ({ ...p, room_id: roomId, rate_per_night: rate }));
    setErrors((p) => ({ ...p, room_id: '', rate_per_night: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const nights = form.check_in && form.check_out
    ? Math.max(0, Math.round((new Date(form.check_out) - new Date(form.check_in)) / 86400000))
    : 0;

  const estimatedTotal = nights > 0 && form.rate_per_night
    ? (parseFloat(form.rate_per_night) * nights).toFixed(2)
    : null;

  const validate = () => {
    const errs = {};
    if (!form.guest_name.trim()) errs.guest_name = 'Name is required';
    if (!form.guest_phone.trim()) errs.guest_phone = 'Phone is required';
    if (!form.room_id) errs.room_id = 'Select a room';
    if (!form.check_in) errs.check_in = 'Check-in date is required';
    if (!form.check_out) errs.check_out = 'Check-out date is required';
    if (form.check_in && form.check_out && form.check_out <= form.check_in) errs.check_out = 'Must be after check-in';
    if (!form.rate_per_night || parseFloat(form.rate_per_night) <= 0) errs.rate_per_night = 'Enter a valid rate';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setServerError('');
    setSuccess(null);
    try {
      const res = await api.post('/admin/offline-checkin', {
        ...form,
        room_id: parseInt(form.room_id),
        rate_per_night: parseFloat(form.rate_per_night),
      });
      setSuccess(res.data);
      setForm({ guest_name: '', guest_phone: '', guest_email: '', room_id: '', check_in: '', check_out: '', rate_per_night: '', notes: '' });
      fetchData();
    } catch (err) {
      setServerError(err.response?.data?.error || 'Failed to create offline check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.id.toString() === form.room_id);
  const availableRooms = rooms.filter((r) => r.status === 'available');

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (ts) => ts ? new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-gold-500" /> Offline Walk-in Check-in
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Register walk-in guests directly — generates an OFL booking ID and immediately marks as checked in</p>
        </div>

        <div className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* LEFT: Form */}
          <div className="xl:col-span-2 space-y-6">

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-green-800 text-lg">Check-in Successful!</div>
                  <div className="text-green-700 text-sm mt-1">
                    Booking Reference: <span className="font-mono font-bold text-green-900 text-base">{success.offline_ref}</span>
                  </div>
                  <div className="text-green-600 text-sm">{success.guest_name} — Room {success.room_number} ({success.category})</div>
                  <button onClick={() => setSuccess(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
                </div>
              </div>
            )}

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <h2 className="font-bold text-navy-900 text-lg border-b pb-3">Guest Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1"><User className="w-3.5 h-3.5" /> Full Name *</label>
                  <input name="guest_name" value={form.guest_name} onChange={handleChange}
                    className={`form-input ${errors.guest_name ? 'border-red-400' : ''}`} placeholder="Guest name" />
                  {errors.guest_name && <p className="text-red-500 text-xs mt-1">{errors.guest_name}</p>}
                </div>
                <div>
                  <label className="form-label flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone *</label>
                  <input name="guest_phone" value={form.guest_phone} onChange={handleChange}
                    className={`form-input ${errors.guest_phone ? 'border-red-400' : ''}`} placeholder="+91 98765 43210" />
                  {errors.guest_phone && <p className="text-red-500 text-xs mt-1">{errors.guest_phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Email <span className="text-gray-400">(optional)</span></label>
                  <input name="guest_email" value={form.guest_email} onChange={handleChange}
                    type="email" className="form-input" placeholder="guest@email.com" />
                </div>
              </div>

              <h2 className="font-bold text-navy-900 text-lg border-b pb-3 pt-2">Room & Dates</h2>

              <div>
                <label className="form-label flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> Room *</label>
                {loadingData ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader className="w-4 h-4 animate-spin" /> Loading rooms...</div>
                ) : (
                  <select value={form.room_id} onChange={(e) => handleRoomChange(e.target.value)}
                    className={`form-input ${errors.room_id ? 'border-red-400' : ''}`}>
                    <option value="">-- Select an available room --</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} — {r.category.charAt(0).toUpperCase() + r.category.slice(1)} (Floor {r.floor})
                      </option>
                    ))}
                  </select>
                )}
                {errors.room_id && <p className="text-red-500 text-xs mt-1">{errors.room_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Check-in Date *</label>
                  <input type="date" name="check_in" value={form.check_in} min={today}
                    onChange={handleChange} className={`form-input ${errors.check_in ? 'border-red-400' : ''}`} />
                  {errors.check_in && <p className="text-red-500 text-xs mt-1">{errors.check_in}</p>}
                </div>
                <div>
                  <label className="form-label flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Check-out Date *</label>
                  <input type="date" name="check_out" value={form.check_out} min={form.check_in || today}
                    onChange={handleChange} className={`form-input ${errors.check_out ? 'border-red-400' : ''}`} />
                  {errors.check_out && <p className="text-red-500 text-xs mt-1">{errors.check_out}</p>}
                </div>
              </div>

              <h2 className="font-bold text-navy-900 text-lg border-b pb-3 pt-2">Offline Rate</h2>

              {/* Base rates reference */}
              {Object.keys(baseRates).length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {['standard', 'deluxe', 'family'].map((cat) => (
                    <div key={cat} className={`p-3 rounded-xl border-2 text-center transition-all ${selectedRoom?.category === cat ? 'border-navy-900 bg-navy-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="text-xs text-gray-500 capitalize mb-0.5">{cat}</div>
                      <div className="font-bold text-navy-900 text-sm">₹{baseRates[cat]?.price}/night</div>
                      <div className="text-xs text-gray-400">Weekend: ₹{baseRates[cat]?.weekend_price}</div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="form-label flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> Rate Per Night (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                  <input type="number" name="rate_per_night" value={form.rate_per_night} onChange={handleChange}
                    className={`form-input pl-8 ${errors.rate_per_night ? 'border-red-400' : ''}`}
                    placeholder="e.g. 2500" min="0" step="0.01" />
                </div>
                {errors.rate_per_night && <p className="text-red-500 text-xs mt-1">{errors.rate_per_night}</p>}
                <p className="text-xs text-gray-400 mt-1">You can override the standard rate for this walk-in guest</p>
              </div>

              {estimatedTotal && (
                <div className="flex items-center justify-between bg-navy-50 border border-navy-200 rounded-xl p-4">
                  <span className="text-navy-700 font-medium text-sm">{nights} night{nights !== 1 ? 's' : ''} × ₹{form.rate_per_night}</span>
                  <span className="text-navy-900 font-bold text-lg flex items-center gap-0.5">
                    <IndianRupee className="w-4 h-4" />{estimatedTotal}
                  </span>
                </div>
              )}

              <div>
                <label className="form-label">Notes <span className="text-gray-400">(optional)</span></label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                  className="form-input resize-none" placeholder="e.g. Corporate rate, special request..." />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base">
                {submitting ? <><Loader className="w-5 h-5 animate-spin" /> Processing...</> : <><UserCheck className="w-5 h-5" /> Check In & Generate OFL ID</>}
              </button>
            </form>
          </div>

          {/* RIGHT: Summary + Offline Bookings */}
          <div className="space-y-6">
            {/* Selected Room Card */}
            {selectedRoom && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-navy-900 mb-3">Selected Room</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Room No.</span>
                    <span className="font-bold text-navy-900">{selectedRoom.room_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${categoryColors[selectedRoom.category]}`}>{selectedRoom.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Floor</span>
                    <span className="font-medium">{selectedRoom.floor}</span>
                  </div>
                  {baseRates[selectedRoom.category] && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Standard Rate</span>
                        <span className="font-medium">₹{baseRates[selectedRoom.category].price}/night</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weekend Rate</span>
                        <span className="font-medium">₹{baseRates[selectedRoom.category].weekend_price}/night</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Guest capacity hint */}
            {selectedRoom && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>Capacity: up to {selectedRoom.capacity} guests</span>
              </div>
            )}
          </div>
        </div>

        {/* Offline Bookings Table */}
        <div className="px-8 pb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-navy-900">Offline / Walk-in Bookings</h2>
              <span className="text-sm text-gray-400">{offlineBookings.length} record{offlineBookings.length !== 1 ? 's' : ''}</span>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 text-navy-900 animate-spin" /></div>
            ) : offlineBookings.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No offline bookings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {['OFL Ref', 'Guest', 'Room', 'Check-in', 'Check-out', 'Rate/Night', 'Total', 'Actual Check-in', 'Status'].map((h) => (
                        <th key={h} className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {offlineBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-gold-600">{b.offline_ref || '—'}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-navy-900">{b.guest_name}</div>
                          <div className="text-gray-400 text-xs">{b.guest_phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-navy-900">Room {b.room_number}</div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${categoryColors[b.category]}`}>{b.category}</span>
                        </td>
                        <td className="px-6 py-4 text-navy-900">{formatDate(b.check_in)}</td>
                        <td className="px-6 py-4 text-navy-900">{formatDate(b.check_out)}</td>
                        <td className="px-6 py-4 font-medium text-navy-900">₹{b.offline_rate}</td>
                        <td className="px-6 py-4 font-bold text-navy-900">₹{b.total_price?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-green-700 text-xs">{formatDateTime(b.actual_checkin)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>
                            {b.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

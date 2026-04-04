import { useState, useEffect } from 'react';
import { ClipboardList, Loader, AlertCircle, LogIn, LogOut, CheckCircle, XCircle, Edit2, Search } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../services/api';

const EVENT_CONFIG = {
  confirmed:      { label: 'Booking Created',  icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
  checked_in:     { label: 'Checked In',        icon: LogIn,        color: 'bg-green-100 text-green-700' },
  checked_out:    { label: 'Checked Out',       icon: LogOut,       color: 'bg-gray-100 text-gray-700' },
  cancelled:      { label: 'Cancelled',         icon: XCircle,      color: 'bg-red-100 text-red-700' },
  room_reassigned:{ label: 'Room Reassigned',   icon: Edit2,        color: 'bg-yellow-100 text-yellow-700' },
};

export default function BookingLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingIdFilter, setBookingIdFilter] = useState('');
  const [applied, setApplied] = useState('');

  const fetchLogs = async (bookingId = '') => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (bookingId) params.booking_id = bookingId;
      const res = await api.get('/admin/booking-logs', { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load booking logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied(bookingIdFilter);
    fetchLogs(bookingIdFilter);
  };

  const handleClear = () => {
    setBookingIdFilter('');
    setApplied('');
    fetchLogs('');
  };

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-bold text-navy-900">Booking Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full audit trail of check-ins, check-outs, and booking events</p>
        </div>

        <div className="p-8">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={bookingIdFilter}
                onChange={(e) => setBookingIdFilter(e.target.value)}
                placeholder="Filter by Booking ID"
                className="form-input pl-9 w-56"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-navy-900 text-white rounded-xl text-sm font-medium hover:bg-navy-800 transition-colors">
              Search
            </button>
            {applied && (
              <button type="button" onClick={handleClear} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Clear
              </button>
            )}
            <span className="text-sm text-gray-400 ml-auto">{total} log {total !== 1 ? 'entries' : 'entry'}</span>
          </form>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-navy-900 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No log entries found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Guest</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actual Check-in</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actual Check-out</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Performed By</th>
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const cfg = EVENT_CONFIG[log.event] || { label: log.event, icon: ClipboardList, color: 'bg-gray-100 text-gray-700' };
                    const Icon = cfg.icon;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-navy-900 font-semibold">
                          #{String(log.booking_id).padStart(6, '0')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-navy-900">{log.guest_name}</div>
                          <div className="text-gray-400 text-xs">{log.guest_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-navy-900">Room {log.room_number}</div>
                          <div className="text-gray-400 text-xs capitalize">{log.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-navy-900">{formatDate(log.check_in)}</div>
                          <div className="text-gray-400 text-xs">→ {formatDate(log.check_out)}</div>
                        </td>
                        <td className="px-6 py-4 text-green-700 whitespace-nowrap font-medium">
                          {log.actual_checkin ? formatDateTime(log.actual_checkin) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap font-medium">
                          {log.actual_checkout ? formatDateTime(log.actual_checkout) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{log.performed_by_name || '—'}</td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{log.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

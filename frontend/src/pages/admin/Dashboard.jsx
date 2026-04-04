import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BedDouble, IndianRupee, Users, BarChart2,
  Loader, AlertCircle, ArrowRight, Calendar, CheckCircle, XCircle, Edit2, X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getAdminStats, updateBooking, getRooms } from '../../services/api';

const statusColors = {
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingBooking, setUpdatingBooking] = useState(null);
  const [reassignModal, setReassignModal] = useState(null); // { bookingId, category }
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reassignError, setReassignError] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await getAdminStats();
      setStats(res.data);
    } catch (err) {
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    getRooms().then((res) => setRooms(res.data)).catch(() => {});
  }, []);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setUpdatingBooking(bookingId);
    try {
      await updateBooking(bookingId, { status: newStatus });
      await fetchStats();
    } catch (err) {
      console.error('Failed to update booking status');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const openReassign = (booking) => {
    setReassignModal(booking);
    setSelectedRoomId('');
    setReassignError('');
  };

  const handleReassign = async () => {
    if (!selectedRoomId) { setReassignError('Please select a room'); return; }
    setReassigning(true);
    try {
      await updateBooking(reassignModal.id, { room_id: parseInt(selectedRoomId) });
      setReassignModal(null);
      await fetchStats();
    } catch (err) {
      setReassignError(err.response?.data?.error || 'Failed to reassign room');
    } finally {
      setReassigning(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening at Grand Vista.</p>
        </div>

        <div className="p-8">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader className="w-10 h-10 text-navy-900 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Loading dashboard...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {stats && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Total</span>
                  </div>
                  <div className="text-3xl font-bold text-navy-900">{stats.totalBookings}</div>
                  <div className="text-sm text-gray-500 mt-1">Total Bookings</div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Revenue</span>
                  </div>
                  <div className="text-3xl font-bold text-navy-900">{formatCurrency(stats.revenue)}</div>
                  <div className="text-sm text-gray-500 mt-1">Total Revenue</div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <BedDouble className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">{stats.totalRooms} total</span>
                  </div>
                  <div className="text-3xl font-bold text-navy-900">{stats.availableRooms}</div>
                  <div className="text-sm text-gray-500 mt-1">Available Rooms</div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center">
                      <BarChart2 className="w-5 h-5 text-gold-600" />
                    </div>
                    <span className="text-xs text-gold-600 font-medium bg-gold-50 px-2 py-0.5 rounded-full">Today</span>
                  </div>
                  <div className="text-3xl font-bold text-navy-900">{stats.occupancyRate}%</div>
                  <div className="text-sm text-gray-500 mt-1">Occupancy Rate</div>
                </div>
              </div>

              {/* Occupancy Bar */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-navy-900">Current Occupancy</h3>
                  <span className="text-sm text-gray-500">{stats.totalRooms - stats.availableRooms} of {stats.totalRooms} rooms occupied</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-navy-700 to-navy-900 rounded-full transition-all duration-700"
                    style={{ width: `${stats.occupancyRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>0%</span>
                  <span className="font-medium text-navy-900">{stats.occupancyRate}% occupied</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { to: '/admin/rooms', label: 'Manage Rooms', icon: BedDouble, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                  { to: '/admin/rates', label: 'Update Rates', icon: IndianRupee, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                  { to: '/admin/bulk-update', label: 'Bulk Update', icon: Calendar, color: 'bg-gold-50 text-gold-700 hover:bg-gold-100' },
                  { to: '/admin/users', label: 'Manage Users', icon: Users, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.to}
                      to={action.to}
                      className={`flex items-center gap-2 p-4 rounded-xl font-medium text-sm transition-all duration-200 ${action.color}`}
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-navy-900">Recent Bookings</h3>
                  <span className="text-sm text-gray-400">{stats.recentBookings.length} bookings</span>
                </div>

                {stats.recentBookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No bookings yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Guest</th>
                          <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Room</th>
                          <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Dates</th>
                          <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.recentBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-navy-900">{booking.guest_name}</div>
                              <div className="text-gray-400 text-xs">{booking.guest_email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <div>
                                  <div className="font-medium text-navy-900">Room {booking.room_number}</div>
                                  <div className="text-gray-400 text-xs capitalize">{booking.category}</div>
                                </div>
                                <button
                                  onClick={() => openReassign(booking)}
                                  className="p-1 hover:bg-gray-100 text-gray-400 hover:text-navy-900 rounded transition-colors"
                                  title="Reassign room"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-navy-900">{formatDate(booking.check_in)}</div>
                              <div className="text-gray-400 text-xs">→ {formatDate(booking.check_out)}</div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-navy-900">
                              {formatCurrency(booking.total_price)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                                {statusLabels[booking.status] || booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                {booking.status === 'confirmed' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(booking.id, 'checked_in')}
                                      disabled={updatingBooking === booking.id}
                                      className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors disabled:opacity-50"
                                      title="Check In"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                                      disabled={updatingBooking === booking.id}
                                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                                      title="Cancel"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {booking.status === 'checked_in' && (
                                  <button
                                    onClick={() => handleUpdateStatus(booking.id, 'checked_out')}
                                    disabled={updatingBooking === booking.id}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    Check Out
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Reassign Room Modal */}
      {reassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-navy-900">Reassign Room</h3>
              <button onClick={() => setReassignModal(null)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Booking #{reassignModal.id} — <span className="capitalize font-medium">{reassignModal.guest_name}</span>
              <br />Currently in Room <span className="font-bold text-navy-900">{reassignModal.room_number}</span> ({reassignModal.category})
            </p>
            <label className="form-label">Select New Room</label>
            <select
              value={selectedRoomId}
              onChange={(e) => { setSelectedRoomId(e.target.value); setReassignError(''); }}
              className="form-input mb-1"
            >
              <option value="">-- Select a room --</option>
              {rooms
                .filter((r) => r.status === 'available' && r.id !== reassignModal.room_id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.category.charAt(0).toUpperCase() + r.category.slice(1)} (Floor {r.floor})
                  </option>
                ))}
            </select>
            {reassignError && <p className="text-red-500 text-xs mb-3">{reassignError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setReassignModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={reassigning}
                className="flex-1 py-2.5 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reassigning ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {reassigning ? 'Saving...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

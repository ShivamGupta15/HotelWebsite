import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader, AlertCircle, X, Users, Shield, UserCog } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../../services/api';
import { useAdminAuth } from '../../App';

const roleColors = {
  admin: 'bg-purple-100 text-purple-800',
  staff: 'bg-blue-100 text-blue-800',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff' };

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user ? {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!user && !form.password) errs.password = 'Password is required';
    if (form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
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
      const data = { ...form };
      if (!data.password) delete data.password;
      if (user) {
        await updateAdminUser(user.id, data);
      } else {
        await createAdminUser(data);
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
          <h2 className="text-lg font-bold text-navy-900">{user ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {apiError && (
            <div className="bg-red-50 text-red-700 px-3 py-2.5 rounded-lg text-sm">{apiError}</div>
          )}

          <div>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`form-input ${errors.name ? 'border-red-400' : ''}`}
              placeholder="John Smith"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`form-input ${errors.email ? 'border-red-400' : ''}`}
              placeholder="user@hotel.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="form-label">{user ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`form-input ${errors.password ? 'border-red-400' : ''}`}
              placeholder={user ? '••••••••' : 'Min 6 characters'}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="form-label">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="form-input"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Admins have full access; Staff has limited access</p>
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
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : (user ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersAdmin() {
  const { user: currentUser } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${user.name}"?`)) return;
    setDeletingId(user.id);
    try {
      await deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccessMsg('User deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Users Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage admin and staff accounts</p>
          </div>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {successMsg}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Total Users</span>
              </div>
              <div className="text-2xl font-bold text-navy-900">{users.length}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-500">Admins</span>
              </div>
              <div className="text-2xl font-bold text-navy-900">{users.filter((u) => u.role === 'admin').length}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <UserCog className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500">Staff</span>
              </div>
              <div className="text-2xl font-bold text-navy-900">{users.filter((u) => u.role === 'staff').length}</div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-navy-900 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {users.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No users found</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-navy-900 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-navy-900">
                                {user.name}
                                {user.id === currentUser?.id && (
                                  <span className="ml-2 text-xs text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded-full">(you)</span>
                                )}
                              </div>
                              <div className="text-gray-400 text-xs">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(user.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setEditingUser(user); setShowModal(true); }}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={deletingId === user.id || user.id === currentUser?.id}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={user.id === currentUser?.id ? "Can't delete your own account" : "Delete"}
                            >
                              {deletingId === user.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
        <UserModal
          user={editingUser}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSave={fetchUsers}
        />
      )}
    </div>
  );
}

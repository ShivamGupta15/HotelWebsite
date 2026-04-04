import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getMe } from './services/api';

// Pages
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import RoomsAdmin from './pages/admin/RoomsAdmin';
import RatesAdmin from './pages/admin/RatesAdmin';
import PhotosAdmin from './pages/admin/PhotosAdmin';
import UsersAdmin from './pages/admin/UsersAdmin';
import BulkUpdate from './pages/admin/BulkUpdate';
import BookingLogs from './pages/admin/BookingLogs';
import OfflineCheckin from './pages/admin/OfflineCheckin';

// Auth Context
export const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify token is still valid
        getMe()
          .then((res) => setUser(res.data.user))
          .catch(() => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            setUser(null);
          })
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-navy-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-900 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/confirmation" element={<BookingConfirmation />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <ProtectedRoute>
                <RoomsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rates"
            element={
              <ProtectedRoute>
                <RatesAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/photos"
            element={
              <ProtectedRoute>
                <PhotosAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <UsersAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bulk-update"
            element={
              <ProtectedRoute>
                <BulkUpdate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/offline-checkin"
            element={
              <ProtectedRoute>
                <OfflineCheckin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/booking-logs"
            element={
              <ProtectedRoute>
                <BookingLogs />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

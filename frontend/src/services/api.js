import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://ramainn.onrender.com';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const UPLOADS_BASE = `${API_BASE}/uploads`;

export const getPhotoUrl = (filename) =>
  filename?.startsWith('http') ? filename : filename ? `${UPLOADS_BASE}/${filename}` : null;

// Request interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getMe = () => api.get('/auth/me');

// Rooms
export const getRooms = (params = {}) =>
  api.get('/rooms', { params });

export const getRoom = (id) => api.get(`/rooms/${id}`);

export const createRoom = (data) => api.post('/rooms', data);

export const updateRoom = (id, data) => api.put(`/rooms/${id}`, data);

export const deleteRoom = (id) => api.delete(`/rooms/${id}`);

// Photos
export const getRoomPhotos = (roomId) => api.get(`/rooms/${roomId}/photos`);

export const uploadPhoto = (roomId, formData) =>
  api.post(`/rooms/${roomId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deletePhoto = (photoId) => api.delete(`/rooms/photos/${photoId}`);

export const setPrimaryPhoto = (photoId) =>
  api.put(`/rooms/photos/${photoId}/primary`);

// Base Rates
export const getBaseRates = () => api.get('/base-rates');

export const updateBaseRate = (category, data) =>
  api.put(`/base-rates/${category}`, data);

// Rates
export const getRates = (params = {}) => api.get('/rates', { params });

export const createRate = (data) => api.post('/rates', data);

export const bulkUpdateRates = (data) => api.post('/rates/bulk', data);

export const deleteRate = (id) => api.delete(`/rates/${id}`);

// Bookings
export const getBookings = (params = {}) =>
  api.get('/bookings', { params });

export const createBooking = (data) => api.post('/bookings', data);

export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);

export const checkAvailability = (params) =>
  api.get('/bookings/check-availability', { params });

// Admin
export const getAdminStats = () => api.get('/admin/stats');

export const getAdminUsers = () => api.get('/admin/users');

export const createAdminUser = (data) => api.post('/admin/users', data);

export const updateAdminUser = (id, data) =>
  api.put(`/admin/users/${id}`, data);

export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);

export const getAdminRates = (params = {}) =>
  api.get('/admin/rates', { params });

export const createAdminRate = (data) => api.post('/admin/rates', data);

export const bulkUpdateAdminRates = (data) =>
  api.post('/admin/rates/bulk', data);

export const deleteAdminRate = (id) => api.delete(`/admin/rates/${id}`);

export const getBookingLogs = (params = {}) =>
  api.get('/admin/booking-logs', { params });

export const clearBookingLogs = () =>
  api.delete('/admin/booking-logs');

export const offlineCheckin = (data) =>
  api.post('/admin/offline-checkin', data);

export const getOfflineBookings = () =>
  api.get('/admin/offline-bookings');

export const getOfflineRates = () =>
  api.get('/admin/offline-rates');

export default api;

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require authentication
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const db = getDb();

  const totalBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status != 'cancelled'").get();
  const revenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status NOT IN ('cancelled')").get();
  const availableRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get();
  const totalRooms = db.prepare("SELECT COUNT(*) as count FROM rooms").get();

  const today = new Date().toISOString().split('T')[0];
  const occupiedRooms = db.prepare(`
    SELECT COUNT(DISTINCT room_id) as count FROM bookings
    WHERE status IN ('confirmed', 'checked_in')
    AND check_in <= ? AND check_out > ?
  `).get(today, today);

  const occupancyRate = totalRooms.count > 0
    ? Math.round((occupiedRooms.count / totalRooms.count) * 100)
    : 0;

  const recentBookings = db.prepare(`
    SELECT b.*, r.room_number, r.category
    FROM bookings b
    LEFT JOIN rooms r ON r.id = b.room_id
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all();

  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(total_price) as revenue, COUNT(*) as bookings
    FROM bookings
    WHERE status NOT IN ('cancelled')
    AND created_at >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month
  `).all();

  res.json({
    totalBookings: totalBookings.count,
    revenue: revenue.total,
    availableRooms: availableRooms.count,
    totalRooms: totalRooms.count,
    occupancyRate,
    recentBookings,
    monthlyRevenue,
  });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// POST /api/admin/users
router.post('/users', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, hashedPassword, role);

  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res) => {
  const { name, email, password, role } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (email && email !== user.email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
  }

  if (role && !['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff' });
  }

  let hashedPassword = null;
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    hashedPassword = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      password = COALESCE(?, password),
      role = COALESCE(?, role)
    WHERE id = ?
  `).run(name || null, email || null, hashedPassword, role || null, req.params.id);

  const updatedUser = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updatedUser);
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const db = getDb();

  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted successfully' });
});

// GET /api/admin/rates
router.get('/rates', (req, res) => {
  const { room_id, start_date, end_date } = req.query;
  const db = getDb();

  let query = `
    SELECT rt.*, r.room_number, r.category
    FROM rates rt
    LEFT JOIN rooms r ON r.id = rt.room_id
    WHERE 1=1
  `;
  const params = [];

  if (room_id) {
    query += ' AND rt.room_id = ?';
    params.push(room_id);
  }
  if (start_date) {
    query += ' AND rt.date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND rt.date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY rt.date, r.room_number';
  const rates = db.prepare(query).all(...params);
  res.json(rates);
});

// POST /api/admin/rates
router.post('/rates', (req, res) => {
  const { room_id, date, price } = req.body;

  if (!room_id || !date || price === undefined) {
    return res.status(400).json({ error: 'room_id, date, and price are required' });
  }

  const db = getDb();
  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(room_id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const result = db.prepare(
    'INSERT OR REPLACE INTO rates (room_id, date, price) VALUES (?, ?, ?)'
  ).run(room_id, date, parseFloat(price));

  const rate = db.prepare(`
    SELECT rt.*, r.room_number, r.category
    FROM rates rt
    LEFT JOIN rooms r ON r.id = rt.room_id
    WHERE rt.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(rate);
});

// POST /api/admin/rates/bulk
router.post('/rates/bulk', (req, res) => {
  const { categories, dates, price } = req.body;

  if (!categories || !dates || price === undefined || !Array.isArray(categories) || !Array.isArray(dates)) {
    return res.status(400).json({ error: 'categories (array), dates (array), and price are required' });
  }

  if (categories.length === 0 || dates.length === 0) {
    return res.status(400).json({ error: 'At least one category and one date are required' });
  }

  const db = getDb();
  const rooms = db.prepare(
    `SELECT id FROM rooms WHERE category IN (${categories.map(() => '?').join(',')})`
  ).all(...categories);

  if (rooms.length === 0) {
    return res.status(404).json({ error: 'No rooms found for the selected categories' });
  }

  const insertRate = db.prepare('INSERT OR REPLACE INTO rates (room_id, date, price) VALUES (?, ?, ?)');
  const bulkInsert = db.transaction(() => {
    let count = 0;
    for (const room of rooms) {
      for (const date of dates) {
        insertRate.run(room.id, date, parseFloat(price));
        count++;
      }
    }
    return count;
  });

  const count = bulkInsert();
  res.json({ message: `Updated ${count} rate entries`, count });
});

// DELETE /api/admin/rates/:id
router.delete('/rates/:id', (req, res) => {
  const db = getDb();
  const rate = db.prepare('SELECT * FROM rates WHERE id = ?').get(req.params.id);

  if (!rate) {
    return res.status(404).json({ error: 'Rate not found' });
  }

  db.prepare('DELETE FROM rates WHERE id = ?').run(req.params.id);
  res.json({ message: 'Rate deleted successfully' });
});

// GET /api/admin/booking-logs
router.get('/booking-logs', (req, res) => {
  const { booking_id, limit = 100, offset = 0 } = req.query;
  const db = getDb();

  let query = `
    SELECT bl.*,
      b.guest_name, b.guest_email, b.guest_phone,
      b.check_in, b.check_out, b.total_price, b.actual_checkin, b.actual_checkout,
      r.room_number, r.category
    FROM booking_logs bl
    LEFT JOIN bookings b ON b.id = bl.booking_id
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE 1=1
  `;
  const params = [];

  if (booking_id) {
    query += ' AND bl.booking_id = ?';
    params.push(booking_id);
  }

  query += ' ORDER BY bl.timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const logs = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM booking_logs${booking_id ? ' WHERE booking_id = ?' : ''}`).get(...(booking_id ? [booking_id] : []));

  res.json({ logs, total: total.count });
});

// POST /api/admin/offline-checkin
router.post('/offline-checkin', (req, res) => {
  const { guest_name, guest_email, guest_phone, room_id, check_in, check_out, rate_per_night, notes } = req.body;

  if (!guest_name || !guest_phone || !room_id || !check_in || !check_out || rate_per_night === undefined) {
    return res.status(400).json({ error: 'guest_name, guest_phone, room_id, check_in, check_out, and rate_per_night are required' });
  }

  const db = getDb();

  const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(room_id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Check room not already occupied for these dates
  const conflict = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ? AND status NOT IN ('cancelled','checked_out')
    AND check_in < ? AND check_out > ?
  `).get(room_id, check_out, check_in);
  if (conflict.count > 0) {
    return res.status(409).json({ error: 'Room is already occupied for the selected dates' });
  }

  const checkInDate = new Date(check_in);
  const checkOutDate = new Date(check_out);
  if (checkOutDate <= checkInDate) {
    return res.status(400).json({ error: 'Check-out must be after check-in' });
  }

  const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const totalPrice = parseFloat(rate_per_night) * nights;
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO bookings
      (guest_name, guest_email, guest_phone, room_id, check_in, check_out,
       total_price, status, booking_type, offline_rate, actual_checkin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'checked_in', 'offline', ?, ?, CURRENT_TIMESTAMP)
  `).run(
    guest_name,
    guest_email || '',
    guest_phone,
    room_id,
    check_in,
    check_out,
    totalPrice,
    parseFloat(rate_per_night),
    now
  );

  const bookingId = result.lastInsertRowid;
  const offlineRef = `OFL${String(bookingId).padStart(6, '0')}`;
  db.prepare('UPDATE bookings SET offline_ref = ? WHERE id = ?').run(offlineRef, bookingId);

  // Log the event
  db.prepare(`
    INSERT INTO booking_logs (booking_id, event, performed_by, performed_by_name, timestamp, notes)
    VALUES (?, 'checked_in', ?, ?, ?, ?)
  `).run(bookingId, req.user?.id || null, req.user?.name || 'Admin', now, notes || `Offline walk-in. Rate: ₹${rate_per_night}/night`);

  const booking = db.prepare(`
    SELECT b.*, r.room_number, r.category
    FROM bookings b LEFT JOIN rooms r ON r.id = b.room_id
    WHERE b.id = ?
  `).get(bookingId);

  res.status(201).json(booking);
});

// GET /api/admin/offline-bookings
router.get('/offline-bookings', (req, res) => {
  const db = getDb();
  const bookings = db.prepare(`
    SELECT b.*, r.room_number, r.category
    FROM bookings b
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE b.booking_type = 'offline'
    ORDER BY b.created_at DESC
    LIMIT 100
  `).all();
  res.json(bookings);
});

// GET /api/admin/offline-rates
router.get('/offline-rates', (req, res) => {
  const db = getDb();
  const rates = db.prepare('SELECT * FROM base_rates ORDER BY category').all();
  const rooms = db.prepare("SELECT id, room_number, category, floor, status FROM rooms ORDER BY room_number").all();
  res.json({ rates, rooms });
});

module.exports = router;

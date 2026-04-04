const express = require('express');
const { getDb } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

function calculateTotalPrice(db, roomId, checkIn, checkOut) {
  const room = db.prepare(`
    SELECT r.category, br.price, br.weekend_price
    FROM rooms r
    LEFT JOIN base_rates br ON br.category = r.category
    WHERE r.id = ?
  `).get(roomId);

  if (!room) return null;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  let total = 0;
  const current = new Date(start);

  while (current < end) {
    const dateStr = current.toISOString().split('T')[0];

    // Check for specific rate override
    const override = db.prepare('SELECT price FROM rates WHERE room_id = ? AND date = ?').get(roomId, dateStr);

    if (override) {
      total += override.price;
    } else {
      // Use base rate (weekend = Fri/Sat)
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      total += isWeekend ? room.weekend_price : room.price;
    }

    current.setDate(current.getDate() + 1);
  }

  return total;
}

function isRoomAvailable(db, roomId, checkIn, checkOut, excludeBookingId = null) {
  let query = `
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ?
    AND status NOT IN ('cancelled', 'checked_out')
    AND check_in < ? AND check_out > ?
  `;
  const params = [roomId, checkOut, checkIn];

  if (excludeBookingId) {
    query += ' AND id != ?';
    params.push(excludeBookingId);
  }

  const result = db.prepare(query).get(...params);
  return result.count === 0;
}

function findAvailableRoom(db, category, checkIn, checkOut, excludeBookingId = null) {
  const rooms = db.prepare(
    "SELECT id FROM rooms WHERE category = ? AND status = 'available' ORDER BY id"
  ).all(category);
  for (const room of rooms) {
    if (isRoomAvailable(db, room.id, checkIn, checkOut, excludeBookingId)) return room.id;
  }
  return null;
}

// GET /api/bookings/check-availability
router.get('/check-availability', (req, res) => {
  const { category, check_in, check_out } = req.query;

  if (!category || !check_in || !check_out) {
    return res.status(400).json({ error: 'category, check_in, and check_out are required' });
  }

  const db = getDb();
  const roomId = findAvailableRoom(db, category, check_in, check_out);
  if (!roomId) return res.json({ available: false, totalPrice: null });

  const totalPrice = calculateTotalPrice(db, roomId, check_in, check_out);
  res.json({ available: true, totalPrice });
});

// GET /api/bookings
router.get('/', authenticateToken, (req, res) => {
  const { status, room_id, guest_email, limit = 50, offset = 0 } = req.query;
  const db = getDb();

  let query = `
    SELECT b.*, r.room_number, r.category
    FROM bookings b
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND b.status = ?';
    params.push(status);
  }
  if (room_id) {
    query += ' AND b.room_id = ?';
    params.push(room_id);
  }
  if (guest_email) {
    query += ' AND b.guest_email LIKE ?';
    params.push(`%${guest_email}%`);
  }

  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const bookings = db.prepare(query).all(...params);

  const totalQuery = `SELECT COUNT(*) as total FROM bookings b WHERE 1=1${status ? ' AND b.status = ?' : ''}${room_id ? ' AND b.room_id = ?' : ''}${guest_email ? ' AND b.guest_email LIKE ?' : ''}`;
  const totalParams = [];
  if (status) totalParams.push(status);
  if (room_id) totalParams.push(room_id);
  if (guest_email) totalParams.push(`%${guest_email}%`);
  const { total } = db.prepare(totalQuery).get(...totalParams);

  res.json({ bookings, total });
});

// POST /api/bookings
router.post('/', (req, res) => {
  const { guest_name, guest_email, guest_phone, category, check_in, check_out } = req.body;

  if (!guest_name || !guest_email || !guest_phone || !category || !check_in || !check_out) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const validCategories = ['standard', 'deluxe', 'family'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid room category' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guest_email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const checkInDate = new Date(check_in);
  const checkOutDate = new Date(check_out);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkInDate < today) {
    return res.status(400).json({ error: 'Check-in date cannot be in the past' });
  }

  if (checkOutDate <= checkInDate) {
    return res.status(400).json({ error: 'Check-out must be after check-in' });
  }

  const db = getDb();

  const roomId = findAvailableRoom(db, category, check_in, check_out);
  if (!roomId) {
    return res.status(409).json({ error: 'No rooms available for the selected category and dates' });
  }

  const totalPrice = calculateTotalPrice(db, roomId, check_in, check_out);

  const result = db.prepare(`
    INSERT INTO bookings (guest_name, guest_email, guest_phone, room_id, check_in, check_out, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).run(guest_name, guest_email, guest_phone, roomId, check_in, check_out, totalPrice);

  const booking = db.prepare(`
    SELECT b.*, r.room_number, r.category
    FROM bookings b
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  // Log booking creation
  db.prepare(`
    INSERT INTO booking_logs (booking_id, event, performed_by_name, timestamp)
    VALUES (?, 'confirmed', 'Guest', CURRENT_TIMESTAMP)
  `).run(result.lastInsertRowid);

  res.status(201).json(booking);
});

// PUT /api/bookings/:id
router.put('/:id', authenticateToken, (req, res) => {
  const { status, room_id } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'checked_in', 'checked_out'];

  if (!status && !room_id) {
    return res.status(400).json({ error: 'status or room_id is required' });
  }
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (room_id) {
    const newRoom = db.prepare("SELECT * FROM rooms WHERE id = ? AND status = 'available'").get(room_id);
    if (!newRoom) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }
    const available = isRoomAvailable(db, room_id, booking.check_in, booking.check_out, booking.id);
    if (!available) {
      return res.status(409).json({ error: 'Selected room is not available for this booking\'s dates' });
    }
    db.prepare('UPDATE bookings SET room_id = ? WHERE id = ?').run(room_id, req.params.id);
  }

  if (status) {
    const now = new Date().toISOString();
    if (status === 'checked_in') {
      db.prepare('UPDATE bookings SET status = ?, actual_checkin = ? WHERE id = ?').run(status, now, req.params.id);
    } else if (status === 'checked_out') {
      db.prepare('UPDATE bookings SET status = ?, actual_checkout = ? WHERE id = ?').run(status, now, req.params.id);
    } else {
      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
    }

    // Insert log entry
    const performer = req.user;
    db.prepare(`
      INSERT INTO booking_logs (booking_id, event, performed_by, performed_by_name, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, status, performer?.id || null, performer?.name || 'System', now);
  }

  if (room_id) {
    // Log room reassignment
    const now = new Date().toISOString();
    const performer = req.user;
    const newRoom = db.prepare('SELECT room_number FROM rooms WHERE id = ?').get(room_id);
    db.prepare(`
      INSERT INTO booking_logs (booking_id, event, performed_by, performed_by_name, timestamp, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, 'room_reassigned', performer?.id || null, performer?.name || 'System', now,
      `Reassigned to Room ${newRoom?.room_number}`);
  }

  const updatedBooking = db.prepare(`
    SELECT b.*, r.room_number, r.category
    FROM bookings b
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE b.id = ?
  `).get(req.params.id);

  res.json(updatedBooking);
});

module.exports = router;

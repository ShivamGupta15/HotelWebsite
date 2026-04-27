const express = require('express');
const { pool } = require('../db/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

async function calculateTotalPrice(roomId, checkIn, checkOut) {
  const { rows } = await pool.query(`
    SELECT r.category, br.price, br.weekend_price
    FROM rooms r
    LEFT JOIN base_rates br ON br.category = r.category
    WHERE r.id = $1
  `, [roomId]);

  const room = rows[0];
  if (!room) return null;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  let total = 0;
  const current = new Date(start);

  while (current < end) {
    const dateStr = current.toISOString().split('T')[0];
    const override = (await pool.query(
      'SELECT price FROM rates WHERE room_id = $1 AND date = $2',
      [roomId, dateStr]
    )).rows[0];

    if (override) {
      total += override.price;
    } else {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      total += isWeekend ? room.weekend_price : room.price;
    }
    current.setDate(current.getDate() + 1);
  }

  return total;
}

async function isRoomAvailable(roomId, checkIn, checkOut, excludeBookingId = null) {
  let query = `
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = $1
    AND status NOT IN ('cancelled', 'checked_out')
    AND check_in < $2 AND check_out > $3
  `;
  const params = [roomId, checkOut, checkIn];

  if (excludeBookingId) {
    query += ` AND id != $4`;
    params.push(excludeBookingId);
  }

  const { rows } = await pool.query(query, params);
  return parseInt(rows[0].count) === 0;
}

async function findAvailableRoom(category, checkIn, checkOut, excludeBookingId = null) {
  const { rows } = await pool.query(
    "SELECT id FROM rooms WHERE category = $1 AND status = 'available' ORDER BY id",
    [category]
  );
  for (const room of rows) {
    if (await isRoomAvailable(room.id, checkIn, checkOut, excludeBookingId)) return room.id;
  }
  return null;
}

// GET /api/bookings/check-availability
router.get('/check-availability', async (req, res) => {
  const { category, check_in, check_out } = req.query;

  if (!category || !check_in || !check_out) {
    return res.status(400).json({ error: 'category, check_in, and check_out are required' });
  }

  try {
    const roomId = await findAvailableRoom(category, check_in, check_out);
    if (!roomId) return res.json({ available: false, totalPrice: null });

    const totalPrice = await calculateTotalPrice(roomId, check_in, check_out);
    res.json({ available: true, totalPrice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings
router.get('/', authenticateToken, async (req, res) => {
  const { status, room_id, guest_email, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT b.*, r.room_number, r.category
    FROM bookings b
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (status) { query += ` AND b.status = $${idx++}`; params.push(status); }
  if (room_id) { query += ` AND b.room_id = $${idx++}`; params.push(room_id); }
  if (guest_email) { query += ` AND b.guest_email LIKE $${idx++}`; params.push(`%${guest_email}%`); }

  query += ` ORDER BY b.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const { rows: bookings } = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM bookings b WHERE 1=1`;
    const countParams = [];
    let cidx = 1;
    if (status) { countQuery += ` AND b.status = $${cidx++}`; countParams.push(status); }
    if (room_id) { countQuery += ` AND b.room_id = $${cidx++}`; countParams.push(room_id); }
    if (guest_email) { countQuery += ` AND b.guest_email LIKE $${cidx++}`; countParams.push(`%${guest_email}%`); }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    res.json({ bookings, total: parseInt(countRows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings
router.post('/', async (req, res) => {
  const { guest_name, guest_email, guest_phone, category, check_in, check_out } = req.body;

  if (!guest_name || !guest_email || !guest_phone || !category || !check_in || !check_out) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['standard', 'deluxe', 'family'].includes(category)) {
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

  if (checkInDate < today) return res.status(400).json({ error: 'Check-in date cannot be in the past' });
  if (checkOutDate <= checkInDate) return res.status(400).json({ error: 'Check-out must be after check-in' });

  try {
    const roomId = await findAvailableRoom(category, check_in, check_out);
    if (!roomId) return res.status(409).json({ error: 'No rooms available for the selected category and dates' });

    const totalPrice = await calculateTotalPrice(roomId, check_in, check_out);

    const { rows } = await pool.query(`
      INSERT INTO bookings (guest_name, guest_email, guest_phone, room_id, check_in, check_out, total_price, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed') RETURNING id
    `, [guest_name, guest_email, guest_phone, roomId, check_in, check_out, totalPrice]);

    const bookingId = rows[0].id;

    await pool.query(`
      INSERT INTO booking_logs (booking_id, event, performed_by_name, timestamp)
      VALUES ($1, 'confirmed', 'Guest', CURRENT_TIMESTAMP)
    `, [bookingId]);

    const booking = (await pool.query(`
      SELECT b.*, r.room_number, r.category
      FROM bookings b
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.id = $1
    `, [bookingId])).rows[0];

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id
router.put('/:id', authenticateToken, async (req, res) => {
  const { status, room_id } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'checked_in', 'checked_out'];

  if (!status && !room_id) return res.status(400).json({ error: 'status or room_id is required' });
  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

  try {
    const booking = (await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id])).rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const now = new Date().toISOString();
    const performer = req.user;

    if (room_id) {
      const newRoom = (await pool.query("SELECT * FROM rooms WHERE id = $1 AND status = 'available'", [room_id])).rows[0];
      if (!newRoom) return res.status(404).json({ error: 'Room not found or not available' });

      const available = await isRoomAvailable(room_id, booking.check_in, booking.check_out, booking.id);
      if (!available) return res.status(409).json({ error: "Selected room is not available for this booking's dates" });

      await pool.query('UPDATE bookings SET room_id = $1 WHERE id = $2', [room_id, req.params.id]);

      const newRoomInfo = (await pool.query('SELECT room_number FROM rooms WHERE id = $1', [room_id])).rows[0];
      await pool.query(`
        INSERT INTO booking_logs (booking_id, event, performed_by, performed_by_name, timestamp, notes)
        VALUES ($1, 'room_reassigned', $2, $3, $4, $5)
      `, [req.params.id, performer?.id || null, performer?.name || 'System', now, `Reassigned to Room ${newRoomInfo?.room_number}`]);
    }

    if (status) {
      if (status === 'checked_in') {
        await pool.query('UPDATE bookings SET status = $1, actual_checkin = $2 WHERE id = $3', [status, now, req.params.id]);
      } else if (status === 'checked_out') {
        await pool.query('UPDATE bookings SET status = $1, actual_checkout = $2 WHERE id = $3', [status, now, req.params.id]);
      } else {
        await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
      }

      await pool.query(`
        INSERT INTO booking_logs (booking_id, event, performed_by, performed_by_name, timestamp)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.params.id, status, performer?.id || null, performer?.name || 'System', now]);
    }

    const updatedBooking = (await pool.query(`
      SELECT b.*, r.room_number, r.category
      FROM bookings b
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.id = $1
    `, [req.params.id])).rows[0];

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

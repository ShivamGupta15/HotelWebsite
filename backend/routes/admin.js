const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalBookings, revenue, availableRooms, totalRooms, occupiedRooms, recentBookings, monthlyRevenue] =
      await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM bookings WHERE status != 'cancelled'"),
        pool.query("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status NOT IN ('cancelled')"),
        pool.query("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'"),
        pool.query("SELECT COUNT(*) as count FROM rooms"),
        pool.query(`
          SELECT COUNT(DISTINCT room_id) as count FROM bookings
          WHERE status IN ('confirmed', 'checked_in')
          AND check_in <= $1 AND check_out > $1
        `, [today]),
        pool.query(`
          SELECT b.*, r.room_number, r.category
          FROM bookings b
          LEFT JOIN rooms r ON r.id = b.room_id
          ORDER BY b.created_at DESC LIMIT 10
        `),
        pool.query(`
          SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_price) as revenue, COUNT(*) as bookings
          FROM bookings
          WHERE status NOT IN ('cancelled')
          AND created_at >= NOW() - INTERVAL '6 months'
          GROUP BY month
          ORDER BY month
        `),
      ]);

    const total = parseInt(totalRooms.rows[0].count);
    const occupied = parseInt(occupiedRooms.rows[0].count);
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    res.json({
      totalBookings: parseInt(totalBookings.rows[0].count),
      revenue: parseFloat(revenue.rows[0].total),
      availableRooms: parseInt(availableRooms.rows[0].count),
      totalRooms: total,
      occupancyRate,
      recentBookings: recentBookings.rows,
      monthlyRevenue: monthlyRevenue.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashedPassword, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role && !['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff' });
  }

  try {
    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      const existing = (await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id])).rows[0];
      if (existing) return res.status(409).json({ error: 'Email already in use' });
    }

    let hashedPassword = null;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      hashedPassword = bcrypt.hashSync(password, 10);
    }

    const { rows } = await pool.query(`
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        role = COALESCE($4, role)
      WHERE id = $5 RETURNING id, name, email, role, created_at
    `, [name || null, email || null, hashedPassword, role || null, req.params.id]);

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/rates
router.get('/rates', async (req, res) => {
  const { room_id, start_date, end_date } = req.query;

  let query = `
    SELECT rt.*, r.room_number, r.category
    FROM rates rt
    LEFT JOIN rooms r ON r.id = rt.room_id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (room_id) { query += ` AND rt.room_id = $${idx++}`; params.push(room_id); }
  if (start_date) { query += ` AND rt.date >= $${idx++}`; params.push(start_date); }
  if (end_date) { query += ` AND rt.date <= $${idx++}`; params.push(end_date); }
  query += ' ORDER BY rt.date, r.room_number';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/rates
router.post('/rates', async (req, res) => {
  const { room_id, date, price } = req.body;

  if (!room_id || !date || price === undefined) {
    return res.status(400).json({ error: 'room_id, date, and price are required' });
  }

  try {
    const room = (await pool.query('SELECT id FROM rooms WHERE id = $1', [room_id])).rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const { rows } = await pool.query(`
      INSERT INTO rates (room_id, date, price) VALUES ($1, $2, $3)
      ON CONFLICT (room_id, date) DO UPDATE SET price = EXCLUDED.price
      RETURNING id
    `, [room_id, date, parseFloat(price)]);

    const rate = (await pool.query(`
      SELECT rt.*, r.room_number, r.category
      FROM rates rt LEFT JOIN rooms r ON r.id = rt.room_id
      WHERE rt.id = $1
    `, [rows[0].id])).rows[0];

    res.status(201).json(rate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/rates/bulk
router.post('/rates/bulk', async (req, res) => {
  const { categories, dates, price } = req.body;

  if (!categories || !dates || price === undefined || !Array.isArray(categories) || !Array.isArray(dates)) {
    return res.status(400).json({ error: 'categories (array), dates (array), and price are required' });
  }
  if (categories.length === 0 || dates.length === 0) {
    return res.status(400).json({ error: 'At least one category and one date are required' });
  }

  try {
    const placeholders = categories.map((_, i) => `$${i + 1}`).join(',');
    const { rows: rooms } = await pool.query(
      `SELECT id FROM rooms WHERE category IN (${placeholders})`,
      categories
    );

    if (rooms.length === 0) return res.status(404).json({ error: 'No rooms found for the selected categories' });

    const client = await pool.connect();
    let count = 0;
    try {
      await client.query('BEGIN');
      for (const room of rooms) {
        for (const date of dates) {
          await client.query(
            `INSERT INTO rates (room_id, date, price) VALUES ($1, $2, $3)
             ON CONFLICT (room_id, date) DO UPDATE SET price = EXCLUDED.price`,
            [room.id, date, parseFloat(price)]
          );
          count++;
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: `Updated ${count} rate entries`, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/rates/:id
router.delete('/rates/:id', async (req, res) => {
  try {
    const rate = (await pool.query('SELECT * FROM rates WHERE id = $1', [req.params.id])).rows[0];
    if (!rate) return res.status(404).json({ error: 'Rate not found' });

    await pool.query('DELETE FROM rates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Rate deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/booking-logs
router.get('/booking-logs', async (req, res) => {
  const { booking_id, limit = 100, offset = 0 } = req.query;

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
  let idx = 1;

  if (booking_id) { query += ` AND bl.booking_id = $${idx++}`; params.push(booking_id); }
  query += ` ORDER BY bl.timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(parseInt(limit), parseInt(offset));

  try {
    const { rows: logs } = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) as count FROM booking_logs';
    const countParams = [];
    if (booking_id) { countQuery += ' WHERE booking_id = $1'; countParams.push(booking_id); }
    const total = (await pool.query(countQuery, countParams)).rows[0];

    res.json({ logs, total: parseInt(total.count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/booking-logs
router.delete('/booking-logs', async (req, res) => {
  try {
    await pool.query('DELETE FROM booking_logs');
    res.json({ success: true, message: 'All booking logs cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear booking logs', details: err.message });
  }
});

// POST /api/admin/offline-checkin
router.post('/offline-checkin', async (req, res) => {
  const { guest_name, guest_email, guest_phone, room_id, check_in, check_out, rate_per_night, notes } = req.body;

  if (!guest_name || !guest_phone || !room_id || !check_in || !check_out || rate_per_night === undefined) {
    return res.status(400).json({ error: 'guest_name, guest_phone, room_id, check_in, check_out, and rate_per_night are required' });
  }

  try {
    const room = (await pool.query('SELECT * FROM rooms WHERE id = $1', [room_id])).rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const conflict = (await pool.query(`
      SELECT COUNT(*) as count FROM bookings
      WHERE room_id = $1 AND status NOT IN ('cancelled','checked_out')
      AND check_in < $2 AND check_out > $3
    `, [room_id, check_out, check_in])).rows[0];
    if (parseInt(conflict.count) > 0) {
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

    const { rows } = await pool.query(`
      INSERT INTO bookings
        (guest_name, guest_email, guest_phone, room_id, check_in, check_out,
         total_price, status, booking_type, offline_rate, actual_checkin, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'checked_in', 'offline', $8, $9, CURRENT_TIMESTAMP)
      RETURNING id
    `, [guest_name, guest_email || '', guest_phone, room_id, check_in, check_out, totalPrice, parseFloat(rate_per_night), now]);

    const bookingId = rows[0].id;
    const offlineRef = `OFL${String(bookingId).padStart(6, '0')}`;
    await pool.query('UPDATE bookings SET offline_ref = $1 WHERE id = $2', [offlineRef, bookingId]);

    await pool.query(`
      INSERT INTO booking_logs (booking_id, event, performed_by, performed_by_name, timestamp, notes)
      VALUES ($1, 'checked_in', $2, $3, $4, $5)
    `, [bookingId, req.user?.id || null, req.user?.name || 'Admin', now, notes || `Offline walk-in. Rate: ₹${rate_per_night}/night`]);

    const booking = (await pool.query(`
      SELECT b.*, r.room_number, r.category
      FROM bookings b LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.id = $1
    `, [bookingId])).rows[0];

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/offline-bookings
router.get('/offline-bookings', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, r.room_number, r.category
      FROM bookings b
      LEFT JOIN rooms r ON r.id = b.room_id
      WHERE b.booking_type = 'offline'
      ORDER BY b.created_at DESC LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/offline-rates
router.get('/offline-rates', async (req, res) => {
  try {
    const [rates, rooms] = await Promise.all([
      pool.query('SELECT * FROM base_rates ORDER BY category'),
      pool.query("SELECT id, room_number, category, floor, status FROM rooms ORDER BY room_number"),
    ]);
    res.json({ rates: rates.rows, rooms: rooms.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

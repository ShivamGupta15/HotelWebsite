require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initializeDatabase } = require('./db/database');
const { authenticateToken, requireAdmin } = require('./middleware/authMiddleware');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://hotelwebsite-6mba.onrender.com',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'Rama Inn API' }));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// GET /api/base-rates
app.get('/api/base-rates', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM base_rates ORDER BY category');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/base-rates/:category
app.put('/api/base-rates/:category', authenticateToken, requireAdmin, async (req, res) => {
  const { price, weekend_price } = req.body;
  const { category } = req.params;

  if (!['standard', 'deluxe', 'family'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  if (price === undefined || weekend_price === undefined) {
    return res.status(400).json({ error: 'Price and weekend_price are required' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE base_rates SET price = $1, weekend_price = $2, updated_at = CURRENT_TIMESTAMP WHERE category = $3 RETURNING *',
      [parseFloat(price), parseFloat(weekend_price), category]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rates
app.get('/api/rates', async (req, res) => {
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

// POST /api/rates
app.post('/api/rates', authenticateToken, requireAdmin, async (req, res) => {
  const { room_id, date, price } = req.body;

  if (!room_id || !date || price === undefined) {
    return res.status(400).json({ error: 'room_id, date, and price are required' });
  }

  try {
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

// POST /api/rates/bulk
app.post('/api/rates/bulk', authenticateToken, requireAdmin, async (req, res) => {
  const { categories, dates, price } = req.body;

  if (!categories || !dates || price === undefined) {
    return res.status(400).json({ error: 'categories, dates, and price are required' });
  }

  try {
    const placeholders = categories.map((_, i) => `$${i + 1}`).join(',');
    const { rows: rooms } = await pool.query(
      `SELECT id FROM rooms WHERE category IN (${placeholders})`,
      categories
    );

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

// DELETE /api/rates/:id
app.delete('/api/rates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rate = (await pool.query('SELECT * FROM rates WHERE id = $1', [req.params.id])).rows[0];
    if (!rate) return res.status(404).json({ error: 'Rate not found' });

    await pool.query('DELETE FROM rates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Rate deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Rama Inn API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });

module.exports = app;

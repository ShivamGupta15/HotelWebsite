require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db/database');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173','https://hotelwebsite-6mba.onrender.com'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Base rates routes (accessible from rooms router)
app.get('/api/base-rates', (req, res) => {
  const { getDb } = require('./db/database');
  const db = getDb();
  const rates = db.prepare('SELECT * FROM base_rates ORDER BY category').all();
  res.json(rates);
});

app.put('/api/base-rates/:category', require('./middleware/authMiddleware').authenticateToken, require('./middleware/authMiddleware').requireAdmin, (req, res) => {
  const { price, weekend_price } = req.body;
  const { category } = req.params;

  if (!['standard', 'deluxe', 'family'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  if (price === undefined || weekend_price === undefined) {
    return res.status(400).json({ error: 'Price and weekend_price are required' });
  }

  const { getDb } = require('./db/database');
  const db = getDb();
  db.prepare(
    'UPDATE base_rates SET price = ?, weekend_price = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?'
  ).run(parseFloat(price), parseFloat(weekend_price), category);

  const rate = db.prepare('SELECT * FROM base_rates WHERE category = ?').get(category);
  res.json(rate);
});

// Rates routes
app.get('/api/rates', (req, res) => {
  const { room_id, start_date, end_date } = req.query;
  const { getDb } = require('./db/database');
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

app.post('/api/rates', require('./middleware/authMiddleware').authenticateToken, require('./middleware/authMiddleware').requireAdmin, (req, res) => {
  const { room_id, date, price } = req.body;

  if (!room_id || !date || price === undefined) {
    return res.status(400).json({ error: 'room_id, date, and price are required' });
  }

  const { getDb } = require('./db/database');
  const db = getDb();
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

app.post('/api/rates/bulk', require('./middleware/authMiddleware').authenticateToken, require('./middleware/authMiddleware').requireAdmin, (req, res) => {
  const { categories, dates, price } = req.body;

  if (!categories || !dates || price === undefined) {
    return res.status(400).json({ error: 'categories, dates, and price are required' });
  }

  const { getDb } = require('./db/database');
  const db = getDb();
  const rooms = db.prepare(
    `SELECT id FROM rooms WHERE category IN (${categories.map(() => '?').join(',')})`
  ).all(...categories);

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

app.delete('/api/rates/:id', require('./middleware/authMiddleware').authenticateToken, require('./middleware/authMiddleware').requireAdmin, (req, res) => {
  const { getDb } = require('./db/database');
  const db = getDb();
  const rate = db.prepare('SELECT * FROM rates WHERE id = ?').get(req.params.id);

  if (!rate) {
    return res.status(404).json({ error: 'Rate not found' });
  }

  db.prepare('DELETE FROM rates WHERE id = ?').run(req.params.id);
  res.json({ message: 'Rate deleted successfully' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Rama Inn API running on port ${PORT}`);
  //console.log(`Admin credentials: admin@hotel.com / admin123`);
});

module.exports = app;

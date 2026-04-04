const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'room-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// GET /api/rooms
router.get('/', (req, res) => {
  const { check_in, check_out, category } = req.query;
  const db = getDb();

  let query = `
    SELECT r.*,
      (SELECT filename FROM room_photos rp WHERE rp.room_id = r.id AND rp.is_primary = 1 LIMIT 1) as primary_photo,
      (SELECT COUNT(*) FROM room_photos rp WHERE rp.room_id = r.id) as photo_count,
      br.price as base_price,
      br.weekend_price as base_weekend_price
    FROM rooms r
    LEFT JOIN base_rates br ON br.category = r.category
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    query += ' AND r.category = ?';
    params.push(category);
  }

  if (check_in && check_out) {
    query += ` AND r.id NOT IN (
      SELECT room_id FROM bookings
      WHERE status NOT IN ('cancelled', 'checked_out')
      AND check_in < ? AND check_out > ?
    )`;
    params.push(check_out, check_in);
  }

  query += ' ORDER BY r.room_number';

  const rooms = db.prepare(query).all(...params);

  res.json(rooms);
});

// GET /api/rooms/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const room = db.prepare(`
    SELECT r.*, br.price as base_price, br.weekend_price as base_weekend_price
    FROM rooms r
    LEFT JOIN base_rates br ON br.category = r.category
    WHERE r.id = ?
  `).get(req.params.id);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const photos = db.prepare('SELECT * FROM room_photos WHERE room_id = ? ORDER BY is_primary DESC, uploaded_at ASC').all(room.id);

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rates = db.prepare(
    'SELECT * FROM rates WHERE room_id = ? AND date >= ? AND date <= ? ORDER BY date'
  ).all(room.id, today, thirtyDaysLater);

  res.json({ ...room, photos, rates });
});

// POST /api/rooms
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { room_number, category, floor, description, amenities, capacity, status } = req.body;

  if (!room_number || !category || !floor) {
    return res.status(400).json({ error: 'Room number, category, and floor are required' });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(room_number);
  if (existing) {
    return res.status(409).json({ error: 'Room number already exists' });
  }

  const result = db.prepare(
    'INSERT INTO rooms (room_number, category, floor, description, amenities, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(room_number, category, parseInt(floor), description || '', amenities || '', parseInt(capacity) || 2, status || 'available');

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(room);
});

// PUT /api/rooms/:id
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { room_number, category, floor, description, amenities, capacity, status } = req.body;
  const db = getDb();

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room_number && room_number !== room.room_number) {
    const existing = db.prepare('SELECT id FROM rooms WHERE room_number = ? AND id != ?').get(room_number, req.params.id);
    if (existing) {
      return res.status(409).json({ error: 'Room number already exists' });
    }
  }

  db.prepare(`
    UPDATE rooms SET
      room_number = COALESCE(?, room_number),
      category = COALESCE(?, category),
      floor = COALESCE(?, floor),
      description = COALESCE(?, description),
      amenities = COALESCE(?, amenities),
      capacity = COALESCE(?, capacity),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(
    room_number || null,
    category || null,
    floor ? parseInt(floor) : null,
    description !== undefined ? description : null,
    amenities !== undefined ? amenities : null,
    capacity ? parseInt(capacity) : null,
    status || null,
    req.params.id
  );

  const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  res.json(updatedRoom);
});

// DELETE /api/rooms/:id
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const activeBookings = db.prepare(
    "SELECT COUNT(*) as count FROM bookings WHERE room_id = ? AND status IN ('confirmed', 'checked_in')"
  ).get(req.params.id);

  if (activeBookings.count > 0) {
    return res.status(409).json({ error: 'Cannot delete room with active bookings' });
  }

  // Delete photos from filesystem
  const photos = db.prepare('SELECT filename FROM room_photos WHERE room_id = ?').all(req.params.id);
  for (const photo of photos) {
    const filePath = path.join(__dirname, '..', 'uploads', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ message: 'Room deleted successfully' });
});

// GET /api/rooms/:id/photos
router.get('/:id/photos', (req, res) => {
  const db = getDb();
  const photos = db.prepare('SELECT * FROM room_photos WHERE room_id = ? ORDER BY is_primary DESC, uploaded_at ASC').all(req.params.id);
  res.json(photos);
});

// POST /api/rooms/:id/photos
router.post('/:id/photos', authenticateToken, requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const db = getDb();
  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const existingPhotos = db.prepare('SELECT COUNT(*) as count FROM room_photos WHERE room_id = ?').get(req.params.id);
  const isPrimary = existingPhotos.count === 0 ? 1 : 0;

  const result = db.prepare(
    'INSERT INTO room_photos (room_id, filename, is_primary) VALUES (?, ?, ?)'
  ).run(req.params.id, req.file.filename, isPrimary);

  const photo = db.prepare('SELECT * FROM room_photos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(photo);
});

// DELETE /api/photos/:id
router.delete('/photos/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const photo = db.prepare('SELECT * FROM room_photos WHERE id = ?').get(req.params.id);

  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  const filePath = path.join(__dirname, '..', 'uploads', photo.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM room_photos WHERE id = ?').run(req.params.id);

  if (photo.is_primary) {
    const nextPhoto = db.prepare('SELECT id FROM room_photos WHERE room_id = ? ORDER BY uploaded_at ASC LIMIT 1').get(photo.room_id);
    if (nextPhoto) {
      db.prepare('UPDATE room_photos SET is_primary = 1 WHERE id = ?').run(nextPhoto.id);
    }
  }

  res.json({ message: 'Photo deleted successfully' });
});

// PUT /api/photos/:id/primary
router.put('/photos/:id/primary', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const photo = db.prepare('SELECT * FROM room_photos WHERE id = ?').get(req.params.id);

  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  db.prepare('UPDATE room_photos SET is_primary = 0 WHERE room_id = ?').run(photo.room_id);
  db.prepare('UPDATE room_photos SET is_primary = 1 WHERE id = ?').run(req.params.id);

  res.json({ message: 'Primary photo updated' });
});

// GET /api/base-rates
router.get('/base-rates/all', (req, res) => {
  const db = getDb();
  const rates = db.prepare('SELECT * FROM base_rates ORDER BY category').all();
  res.json(rates);
});

// PUT /api/base-rates/:category
router.put('/base-rates/:category', authenticateToken, requireAdmin, (req, res) => {
  const { price, weekend_price } = req.body;
  const { category } = req.params;

  if (!['standard', 'deluxe', 'family'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  if (price === undefined || weekend_price === undefined) {
    return res.status(400).json({ error: 'Price and weekend_price are required' });
  }

  const db = getDb();
  db.prepare(
    'UPDATE base_rates SET price = ?, weekend_price = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ?'
  ).run(parseFloat(price), parseFloat(weekend_price), category);

  const rate = db.prepare('SELECT * FROM base_rates WHERE category = ?').get(category);
  res.json(rate);
});

module.exports = router;

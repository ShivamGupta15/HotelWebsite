const express = require('express');
const multer = require('multer');
const path = require('path');
const { pool } = require('../db/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const BUCKET = 'room-photos';

let _supabase = null;
const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// GET /api/rooms
router.get('/', async (req, res) => {
  const { check_in, check_out, category } = req.query;

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
  let idx = 1;

  if (category) {
    query += ` AND r.category = $${idx++}`;
    params.push(category);
  }

  if (check_in && check_out) {
    query += ` AND r.id NOT IN (
      SELECT room_id FROM bookings
      WHERE status NOT IN ('cancelled', 'checked_out')
      AND check_in < $${idx++} AND check_out > $${idx++}
    )`;
    params.push(check_out, check_in);
  }

  query += ' ORDER BY r.room_number';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, br.price as base_price, br.weekend_price as base_weekend_price
      FROM rooms r
      LEFT JOIN base_rates br ON br.category = r.category
      WHERE r.id = $1
    `, [req.params.id]);

    const room = rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const photos = (await pool.query(
      'SELECT * FROM room_photos WHERE room_id = $1 ORDER BY is_primary DESC, uploaded_at ASC',
      [room.id]
    )).rows;

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rates = (await pool.query(
      'SELECT * FROM rates WHERE room_id = $1 AND date >= $2 AND date <= $3 ORDER BY date',
      [room.id, today, thirtyDaysLater]
    )).rows;

    res.json({ ...room, photos, rates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { room_number, category, floor, description, amenities, capacity, status } = req.body;

  if (!room_number || !category || !floor) {
    return res.status(400).json({ error: 'Room number, category, and floor are required' });
  }

  try {
    const existing = (await pool.query('SELECT id FROM rooms WHERE room_number = $1', [room_number])).rows[0];
    if (existing) return res.status(409).json({ error: 'Room number already exists' });

    const { rows } = await pool.query(
      `INSERT INTO rooms (room_number, category, floor, description, amenities, capacity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [room_number, category, parseInt(floor), description || '', amenities || '', parseInt(capacity) || 2, status || 'available']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rooms/:id
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { room_number, category, floor, description, amenities, capacity, status } = req.body;

  try {
    const room = (await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id])).rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room_number && room_number !== room.room_number) {
      const existing = (await pool.query('SELECT id FROM rooms WHERE room_number = $1 AND id != $2', [room_number, req.params.id])).rows[0];
      if (existing) return res.status(409).json({ error: 'Room number already exists' });
    }

    const { rows } = await pool.query(`
      UPDATE rooms SET
        room_number = COALESCE($1, room_number),
        category = COALESCE($2, category),
        floor = COALESCE($3, floor),
        description = COALESCE($4, description),
        amenities = COALESCE($5, amenities),
        capacity = COALESCE($6, capacity),
        status = COALESCE($7, status)
      WHERE id = $8 RETURNING *
    `, [
      room_number || null,
      category || null,
      floor ? parseInt(floor) : null,
      description !== undefined ? description : null,
      amenities !== undefined ? amenities : null,
      capacity ? parseInt(capacity) : null,
      status || null,
      req.params.id,
    ]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const room = (await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id])).rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const activeBookings = (await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE room_id = $1 AND status IN ('confirmed', 'checked_in')",
      [req.params.id]
    )).rows[0];
    if (parseInt(activeBookings.count) > 0) {
      return res.status(409).json({ error: 'Cannot delete room with active bookings' });
    }

    const photos = (await pool.query('SELECT filename FROM room_photos WHERE room_id = $1', [req.params.id])).rows;
    const storagePaths = photos
      .filter(p => p.filename && p.filename.includes(BUCKET))
      .map(p => p.filename.split(`${BUCKET}/`)[1])
      .filter(Boolean);
    if (storagePaths.length > 0) await getSupabase().storage.from(BUCKET).remove(storagePaths);

    await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id/photos
router.get('/:id/photos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM room_photos WHERE room_id = $1 ORDER BY is_primary DESC, uploaded_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms/:id/photos
router.post('/:id/photos', authenticateToken, requireAdmin, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  try {
    const room = (await pool.query('SELECT id FROM rooms WHERE id = $1', [req.params.id])).rows[0];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(req.file.originalname).toLowerCase();
    const storagePath = `room-${req.params.id}/room-${uniqueSuffix}${ext}`;

    const { error: uploadError } = await getSupabase().storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = getSupabase().storage.from(BUCKET).getPublicUrl(storagePath);

    const countResult = (await pool.query('SELECT COUNT(*) as count FROM room_photos WHERE room_id = $1', [req.params.id])).rows[0];
    const isPrimary = parseInt(countResult.count) === 0 ? 1 : 0;

    const { rows } = await pool.query(
      'INSERT INTO room_photos (room_id, filename, is_primary) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, publicUrl, isPrimary]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/photos/:id
router.delete('/photos/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const photo = (await pool.query('SELECT * FROM room_photos WHERE id = $1', [req.params.id])).rows[0];
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    if (photo.filename && photo.filename.includes(BUCKET)) {
      const storagePath = photo.filename.split(`${BUCKET}/`)[1];
      if (storagePath) await getSupabase().storage.from(BUCKET).remove([storagePath]);
    }

    await pool.query('DELETE FROM room_photos WHERE id = $1', [req.params.id]);

    if (photo.is_primary) {
      const next = (await pool.query(
        'SELECT id FROM room_photos WHERE room_id = $1 ORDER BY uploaded_at ASC LIMIT 1',
        [photo.room_id]
      )).rows[0];
      if (next) await pool.query('UPDATE room_photos SET is_primary = 1 WHERE id = $1', [next.id]);
    }

    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/photos/:id/primary
router.put('/photos/:id/primary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const photo = (await pool.query('SELECT * FROM room_photos WHERE id = $1', [req.params.id])).rows[0];
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    await pool.query('UPDATE room_photos SET is_primary = 0 WHERE room_id = $1', [photo.room_id]);
    await pool.query('UPDATE room_photos SET is_primary = 1 WHERE id = $1', [req.params.id]);

    res.json({ message: 'Primary photo updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/base-rates/all
router.get('/base-rates/all', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM base_rates ORDER BY category');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rooms/base-rates/:category
router.put('/base-rates/:category', authenticateToken, requireAdmin, async (req, res) => {
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

module.exports = router;

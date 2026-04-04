const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'grand-vista-hotel-secret-key-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, requireStaff, JWT_SECRET };

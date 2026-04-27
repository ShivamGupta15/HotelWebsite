const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      room_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('standard', 'deluxe', 'family')),
      floor INTEGER NOT NULL,
      description TEXT,
      amenities TEXT,
      capacity INTEGER DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_photos (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS base_rates (
      id SERIAL PRIMARY KEY,
      category TEXT UNIQUE NOT NULL CHECK(category IN ('standard', 'deluxe', 'family')),
      price REAL NOT NULL,
      weekend_price REAL NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rates (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, date)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      guest_name TEXT NOT NULL,
      guest_email TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'checked_in', 'checked_out')),
      booking_type TEXT NOT NULL DEFAULT 'online' CHECK(booking_type IN ('online', 'offline')),
      offline_rate REAL,
      offline_ref TEXT,
      actual_checkin TIMESTAMP,
      actual_checkout TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_logs (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      event TEXT NOT NULL,
      performed_by INTEGER REFERENCES users(id),
      performed_by_name TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    )
  `);

  // Seed admin user from env
  const adminName = process.env.ADMIN_NAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in environment variables');
  }
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length === 0) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      [adminName, adminEmail, hashedPassword, 'admin']
    );
    console.log(`Admin user created: ${adminEmail}`);
  }

  // Seed rooms
  const roomCount = await pool.query('SELECT COUNT(*) as count FROM rooms');
  if (parseInt(roomCount.rows[0].count) === 0) {
    const rooms = [
      ['101', 'standard', 1, 'Comfortable standard room with modern amenities and a lovely garden view. Perfect for solo travelers or couples seeking a relaxing stay.', 'WiFi,TV,Air Conditioning,Mini Fridge,Safe,Hair Dryer', 2, 'available'],
      ['102', 'standard', 1, 'Cozy standard room with contemporary decor and all essential amenities. Features a comfortable queen bed and city view.', 'WiFi,TV,Air Conditioning,Mini Fridge,Safe,Hair Dryer', 2, 'available'],
      ['201', 'deluxe', 2, 'Spacious deluxe room with premium furnishings and stunning panoramic views. Enjoy upgraded toiletries and a sitting area.', 'WiFi,TV,Air Conditioning,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service', 2, 'available'],
      ['202', 'deluxe', 2, 'Elegant deluxe room with luxury bedding and floor-to-ceiling windows. Features a premium bathroom with separate shower and bathtub.', 'WiFi,TV,Air Conditioning,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service', 2, 'available'],
      ['301', 'family', 3, 'Generously sized family suite with separate sleeping areas for parents and children. Includes a kitchenette and spacious living area.', 'WiFi,TV,Air Conditioning,Kitchenette,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service,Extra Beds', 4, 'available'],
      ['302', 'family', 3, 'Luxurious family suite with two bedrooms and a large living room. Perfect for families seeking space and comfort with all premium amenities.', 'WiFi,TV,Air Conditioning,Kitchenette,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service,Extra Beds', 5, 'available'],
    ];
    for (const room of rooms) {
      await pool.query(
        'INSERT INTO rooms (room_number, category, floor, description, amenities, capacity, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        room
      );
    }
    console.log('Rooms seeded successfully');
  }

  // Seed base rates
  const rateCount = await pool.query('SELECT COUNT(*) as count FROM base_rates');
  if (parseInt(rateCount.rows[0].count) === 0) {
    await pool.query("INSERT INTO base_rates (category, price, weekend_price) VALUES ('standard', 89, 119)");
    await pool.query("INSERT INTO base_rates (category, price, weekend_price) VALUES ('deluxe', 149, 179)");
    await pool.query("INSERT INTO base_rates (category, price, weekend_price) VALUES ('family', 199, 229)");
    console.log('Base rates seeded successfully');
  }

  console.log('Database initialized successfully');
}

module.exports = { pool, initializeDatabase };

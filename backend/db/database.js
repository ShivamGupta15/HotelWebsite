const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'hotel.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('standard', 'deluxe', 'family')),
      floor INTEGER NOT NULL,
      description TEXT,
      amenities TEXT,
      capacity INTEGER DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS room_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS base_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT UNIQUE NOT NULL CHECK(category IN ('standard', 'deluxe', 'family')),
      price REAL NOT NULL,
      weekend_price REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      UNIQUE(room_id, date)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_name TEXT NOT NULL,
      guest_email TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      room_id INTEGER NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'checked_in', 'checked_out')),
      actual_checkin DATETIME,
      actual_checkout DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS booking_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      performed_by INTEGER,
      performed_by_name TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (performed_by) REFERENCES users(id)
    );
  `);

  // Seed admin user
  const adminExists = database.prepare('SELECT id FROM users WHERE email = ?').get('admin@hotel.com');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    database.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run('Admin User', 'admin@hotel.com', hashedPassword, 'admin');
    console.log('Admin user created: admin@hotel.com / admin123');
  }

  // Seed rooms
  const roomCount = database.prepare('SELECT COUNT(*) as count FROM rooms').get();
  if (roomCount.count === 0) {
    const insertRoom = database.prepare(
      'INSERT INTO rooms (room_number, category, floor, description, amenities, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const rooms = [
      ['101', 'standard', 1, 'Comfortable standard room with modern amenities and a lovely garden view. Perfect for solo travelers or couples seeking a relaxing stay.', 'WiFi,TV,Air Conditioning,Mini Fridge,Safe,Hair Dryer', 2, 'available'],
      ['102', 'standard', 1, 'Cozy standard room with contemporary decor and all essential amenities. Features a comfortable queen bed and city view.', 'WiFi,TV,Air Conditioning,Mini Fridge,Safe,Hair Dryer', 2, 'available'],
      ['201', 'deluxe', 2, 'Spacious deluxe room with premium furnishings and stunning panoramic views. Enjoy upgraded toiletries and a sitting area.', 'WiFi,TV,Air Conditioning,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service', 2, 'available'],
      ['202', 'deluxe', 2, 'Elegant deluxe room with luxury bedding and floor-to-ceiling windows. Features a premium bathroom with separate shower and bathtub.', 'WiFi,TV,Air Conditioning,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service', 2, 'available'],
      ['301', 'family', 3, 'Generously sized family suite with separate sleeping areas for parents and children. Includes a kitchenette and spacious living area.', 'WiFi,TV,Air Conditioning,Kitchenette,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service,Extra Beds', 4, 'available'],
      ['302', 'family', 3, 'Luxurious family suite with two bedrooms and a large living room. Perfect for families seeking space and comfort with all premium amenities.', 'WiFi,TV,Air Conditioning,Kitchenette,Mini Bar,Safe,Hair Dryer,Bathtub,Room Service,Extra Beds', 5, 'available'],
    ];

    for (const room of rooms) {
      insertRoom.run(...room);
    }
    console.log('Rooms seeded successfully');
  }

  // Seed base rates
  const rateCount = database.prepare('SELECT COUNT(*) as count FROM base_rates').get();
  if (rateCount.count === 0) {
    const insertRate = database.prepare(
      'INSERT INTO base_rates (category, price, weekend_price) VALUES (?, ?, ?)'
    );
    insertRate.run('standard', 89, 119);
    insertRate.run('deluxe', 149, 179);
    insertRate.run('family', 199, 229);
    console.log('Base rates seeded successfully');
  }

  console.log('Database initialized successfully');
  return database;
}

module.exports = { getDb, initializeDatabase };

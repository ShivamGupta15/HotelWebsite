# Rama Inn - Hotel Management System

# MODEL HANDOVER PROTOCOL
- If I switch from Claude to Gemini (or vice versa), the first prompt must be:
  "Read CLAUDE.md and the last code changes. We are currently [Task Name]."
- Always update the 'Current State' section of this file before closing a session.

## Current State
- **Backend/Frontend:** Added "Clear All Logs" functionality to the `BookingLogs` admin page, with a new `DELETE /api/admin/booking-logs` endpoint and UI button.
- **Database Schema:** Updated `bookings` table with `booking_type`, `offline_rate`, and `offline_ref` columns to support walk-in check-ins.
- **Backend:** Updated `JWT_SECRET` default to `rama-inn-hotel-secret-key-2026` for brand consistency.
- **Frontend API Service:** Added missing methods for `getBookingLogs`, `offlineCheckin`, `getOfflineBookings`, `getOfflineRates`, and `clearBookingLogs`.
- **Admin Pages:** Refactored `OfflineCheckin.jsx` and `BookingLogs.jsx` to use named exports from the API service for better consistency. Added "Clear All Logs" button with confirmation.
- **Next Steps:** Verify the walk-in check-in flow with the new database columns and test the new clear logs endpoint locally.

## Project Overview
Full-stack hotel booking and management application for "Rama Inn". Guest-facing booking site + admin panel for managing rooms, rates, bookings, and walk-in check-ins.
... (rest of file)
## Tech Stack
- **Frontend:** React 18 + Vite, Tailwind CSS, React Router, Axios, Lucide icons
- **Backend:** Express.js, SQLite (better-sqlite3), JWT auth, Multer (file uploads)
- **Currency:** Indian Rupees (₹) — never use $ for prices

## Project Structure
```
backend/
  server.js          # Express app entry point (port 5001)
  db/database.js     # SQLite setup and schema
  routes/
    auth.js          # Login, JWT
    rooms.js         # CRUD rooms, photos
    bookings.js      # Bookings, availability check
    admin.js         # Admin stats, users, rates, offline check-in
  middleware/authMiddleware.js  # JWT verification
  uploads/           # Room photos (user-uploaded, gitignored)
  .env               # PORT, JWT_SECRET (gitignored)

frontend/
  src/
    components/      # Navbar, Footer, AdminSidebar, RoomCard, BookingModal
    pages/
      Home.jsx       # Landing page (hero, amenities, accommodations, testimonials)
      Rooms.jsx      # Room listing with filters
      RoomDetail.jsx # Single room view with rate calendar + booking form
      Booking.jsx    # Standalone booking flow
      BookingConfirmation.jsx
      admin/         # Admin panel pages (Dashboard, RoomsAdmin, RatesAdmin,
                     #   PhotosAdmin, BulkUpdate, BookingLogs, UsersAdmin,
                     #   OfflineCheckin, AdminLogin)
    services/api.js  # Axios instance + all API call functions
    App.jsx          # React Router setup
```

## Running Locally
```bash
# Backend
cd backend && npm install && npm run dev    # runs on :5001

# Frontend
cd frontend && npm install && npm run dev   # runs on :5173, proxies /api and /uploads to :5001
```

## Key Conventions
- Brand name is "Rama Inn" (not Grand Vista)
- All prices displayed in ₹ (Indian Rupees), use `IndianRupee` icon from lucide-react
- Date formatting uses `en-IN` locale
- Admin routes require JWT auth via `Authorization: Bearer <token>` header
- Room photos served from `/uploads/<filename>`
- Base rates are per-category (standard, deluxe, family) with weekday/weekend pricing
- Date-specific rate overrides can be set per room
- Offline walk-in check-ins generate OFL- prefixed booking references

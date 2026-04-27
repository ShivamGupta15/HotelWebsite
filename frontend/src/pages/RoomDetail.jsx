import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Wifi, Tv, Wind, Coffee, Bath, Phone,
  Loader, AlertCircle, ImageOff, ChevronLeft, ChevronRight,
  Calendar, IndianRupee, Check, Star
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getRoom, checkAvailability, createBooking } from '../services/api';

const categoryColors = {
  standard: 'bg-blue-100 text-blue-800',
  deluxe: 'bg-purple-100 text-purple-800',
  family: 'bg-green-100 text-green-800',
};

const categoryLabels = {
  standard: 'Standard Room',
  deluxe: 'Deluxe Room',
  family: 'Family Suite',
};

function AmenityItem({ amenity }) {
  const lower = amenity.toLowerCase();
  let icon = null;
  if (lower.includes('wifi')) icon = <Wifi className="w-4 h-4" />;
  else if (lower.includes('tv')) icon = <Tv className="w-4 h-4" />;
  else if (lower.includes('air') || lower.includes('conditioning')) icon = <Wind className="w-4 h-4" />;
  else if (lower.includes('coffee') || lower.includes('bar')) icon = <Coffee className="w-4 h-4" />;
  else if (lower.includes('bath') || lower.includes('tub')) icon = <Bath className="w-4 h-4" />;
  else if (lower.includes('room service') || lower.includes('phone')) icon = <Phone className="w-4 h-4" />;
  else icon = <Check className="w-4 h-4" />;

  return (
    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-700">
      <span className="text-navy-700">{icon}</span>
      <span>{amenity}</span>
    </div>
  );
}

export default function RoomDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [availability, setAvailability] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await getRoom(id);
        setRoom(res.data);
        // Set active photo to primary
        const primaryIdx = res.data.photos?.findIndex((p) => p.is_primary) ?? 0;
        setActivePhoto(Math.max(0, primaryIdx));
      } catch (err) {
        setError('Room not found');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      setFormErrors({ dates: 'Please select both check-in and check-out dates' });
      return;
    }
    setCheckingAvail(true);
    setAvailability(null);
    try {
      const res = await checkAvailability({ category: room.category, check_in: checkIn, check_out: checkOut });
      setAvailability(res.data);
    } catch (err) {
      setFormErrors({ dates: 'Failed to check availability' });
    } finally {
      setCheckingAvail(false);
    }
  };

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;

  const validate = () => {
    const errs = {};
    if (!guestName.trim()) errs.guestName = 'Name is required';
    if (!guestEmail.trim()) errs.guestEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errs.guestEmail = 'Invalid email';
    if (!guestPhone.trim()) errs.guestPhone = 'Phone is required';
    if (!checkIn) errs.checkIn = 'Check-in date is required';
    if (!checkOut) errs.checkOut = 'Check-out date is required';
    if (checkIn && checkOut && checkOut <= checkIn) errs.checkOut = 'Check-out must be after check-in';
    return errs;
  };

  const handleBook = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setBookingLoading(true);
    try {
      const res = await createBooking({
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        category: room.category,
        check_in: checkIn,
        check_out: checkOut,
      });
      navigate('/booking/confirmation', { state: { booking: res.data, room } });
    } catch (err) {
      setFormErrors({ general: err.response?.data?.error || 'Booking failed. Please try again.' });
    } finally {
      setBookingLoading(false);
    }
  };

  // Get rate for a date
  const getRateForDate = (dateStr) => {
    if (!room) return null;
    const override = room.rates?.find((r) => r.date === dateStr);
    if (override) return { price: override.price, isOverride: true };
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    return {
      price: isWeekend ? room.base_weekend_price : room.base_price,
      isOverride: false,
    };
  };

  // Build a 14-day rate calendar
  const rateCalendar = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const rate = getRateForDate(dateStr);
    return { date: dateStr, label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ...rate };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-10 h-10 text-navy-900 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading room details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error || 'Room not found'}</p>
            <button onClick={() => navigate('/rooms')} className="mt-4 btn-secondary text-sm px-4 py-2">
              Back to Rooms
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const amenityList = room.amenities ? room.amenities.split(',').map((a) => a.trim()) : [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-navy-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Rooms</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Room Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md">
              {/* Main Photo */}
              <div className="relative h-72 sm:h-96 bg-gradient-to-br from-navy-100 to-navy-200">
                {room.photos && room.photos.length > 0 ? (
                  <img
                    src={`/uploads/${room.photos[activePhoto]?.filename}`}
                    alt={`Room ${room.room_number}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <ImageOff className="w-16 h-16 text-navy-300 mb-2" />
                    <span className="text-navy-400">No photos available</span>
                  </div>
                )}

                {/* Photo Navigation */}
                {room.photos && room.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setActivePhoto((prev) => (prev === 0 ? room.photos.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActivePhoto((prev) => (prev === room.photos.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      {activePhoto + 1} / {room.photos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {room.photos && room.photos.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
                  {room.photos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setActivePhoto(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        activePhoto === idx ? 'border-navy-900' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={`/uploads/${photo.filename}`}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Room Info */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryColors[room.category] || 'bg-gray-100 text-gray-800'}`}>
                      {categoryLabels[room.category] || room.category}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 capitalize">{room.category} Room</h1>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-navy-900">₹{room.base_price}</div>
                  <div className="text-sm text-gray-400">per night</div>
                  {room.base_weekend_price > room.base_price && (
                    <div className="text-xs text-gray-400">Weekend: ₹{room.base_weekend_price}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <Users className="w-4 h-4" />
                <span>Up to {room.capacity} guests</span>
                <div className="flex items-center gap-1 ml-3">
                  <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                  <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                  <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                  <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                  <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                </div>
              </div>

              {room.description && (
                <p className="text-gray-600 leading-relaxed mb-6">{room.description}</p>
              )}

              {/* Amenities */}
              {amenityList.length > 0 && (
                <div>
                  <h3 className="font-semibold text-navy-900 mb-3">Room Amenities</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {amenityList.map((amenity, idx) => (
                      <AmenityItem key={idx} amenity={amenity} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rate Calendar */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="font-semibold text-navy-900 mb-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold-500" />
                Upcoming Rates (Next 14 Days)
              </h3>
              <p className="text-sm text-gray-400 mb-4">Prices shown are per night</p>
              <div className="grid grid-cols-7 gap-1.5">
                {rateCalendar.map((day) => (
                  <div
                    key={day.date}
                    className={`text-center p-2 rounded-lg text-xs ${
                      day.isOverride
                        ? 'bg-gold-50 border border-gold-200'
                        : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <div className="text-gray-500 mb-1">{day.label}</div>
                    <div className={`font-bold ${day.isOverride ? 'text-gold-700' : 'text-navy-900'}`}>
                      ₹{day.price}
                    </div>
                    {day.isOverride && (
                      <div className="text-gold-600 text-xs mt-0.5">Special</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold text-navy-900 mb-1">Book This Room</h2>
              <p className="text-sm text-gray-500 mb-5">Fill in your details to reserve</p>

              <form onSubmit={handleBook} className="space-y-4">
                {formErrors.general && (
                  <div className="bg-red-50 text-red-700 px-3 py-2.5 rounded-lg text-sm">
                    {formErrors.general}
                  </div>
                )}

                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); setFormErrors((p) => ({ ...p, guestName: '' })); }}
                    className={`form-input text-sm ${formErrors.guestName ? 'border-red-400' : ''}`}
                    placeholder="John Smith"
                  />
                  {formErrors.guestName && <p className="text-red-500 text-xs mt-1">{formErrors.guestName}</p>}
                </div>

                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => { setGuestEmail(e.target.value); setFormErrors((p) => ({ ...p, guestEmail: '' })); }}
                    className={`form-input text-sm ${formErrors.guestEmail ? 'border-red-400' : ''}`}
                    placeholder="john@example.com"
                  />
                  {formErrors.guestEmail && <p className="text-red-500 text-xs mt-1">{formErrors.guestEmail}</p>}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => { setGuestPhone(e.target.value); setFormErrors((p) => ({ ...p, guestPhone: '' })); }}
                    className={`form-input text-sm ${formErrors.guestPhone ? 'border-red-400' : ''}`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {formErrors.guestPhone && <p className="text-red-500 text-xs mt-1">{formErrors.guestPhone}</p>}
                </div>

                <div>
                  <label className="form-label">Check-in Date</label>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => { setCheckIn(e.target.value); setAvailability(null); setFormErrors((p) => ({ ...p, checkIn: '' })); }}
                    className={`form-input text-sm ${formErrors.checkIn ? 'border-red-400' : ''}`}
                  />
                  {formErrors.checkIn && <p className="text-red-500 text-xs mt-1">{formErrors.checkIn}</p>}
                </div>

                <div>
                  <label className="form-label">Check-out Date</label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={(e) => { setCheckOut(e.target.value); setAvailability(null); setFormErrors((p) => ({ ...p, checkOut: '' })); }}
                    className={`form-input text-sm ${formErrors.checkOut ? 'border-red-400' : ''}`}
                  />
                  {formErrors.checkOut && <p className="text-red-500 text-xs mt-1">{formErrors.checkOut}</p>}
                </div>

                {formErrors.dates && (
                  <p className="text-red-500 text-xs">{formErrors.dates}</p>
                )}

                {/* Check Availability */}
                {checkIn && checkOut && !availability && (
                  <button
                    type="button"
                    onClick={handleCheckAvailability}
                    disabled={checkingAvail}
                    className="w-full py-2.5 border-2 border-navy-900 text-navy-900 font-semibold rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {checkingAvail ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Checking...</>
                    ) : (
                      'Check Availability'
                    )}
                  </button>
                )}

                {/* Availability Result */}
                {availability && (
                  <div className={`p-3 rounded-lg text-sm ${availability.available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {availability.available ? (
                      <div>
                        <p className="text-green-700 font-semibold mb-1">Available!</p>
                        <div className="flex justify-between text-green-600">
                          <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                          <span className="font-bold flex items-center">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {availability.totalPrice?.toFixed(2)} total
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-700 font-semibold">Not available for selected dates</p>
                    )}
                  </div>
                )}

                {/* Price Summary */}
                {nights > 0 && !availability && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-gray-600 mb-1">
                      <span>₹{room.base_price} × {nights} night{nights !== 1 ? 's' : ''}</span>
                      <span className="font-medium">₹{(room.base_price * nights).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400">Final price calculated at checkout</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bookingLoading || (availability && !availability.available)}
                  className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  {bookingLoading ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

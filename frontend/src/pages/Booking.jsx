import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Users, IndianRupee, Loader, AlertCircle,
  User, BedDouble
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBaseRates, checkAvailability, createBooking } from '../services/api';

const CATEGORIES = [
  { value: 'standard', label: 'Standard Room', desc: 'Comfortable room with essential amenities', capacity: 2 },
  { value: 'deluxe', label: 'Deluxe Room', desc: 'Spacious room with premium furnishings', capacity: 2 },
  { value: 'family', label: 'Family Suite', desc: 'Generous suite with separate sleeping areas', capacity: 4 },
];

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '');
  const [baseRates, setBaseRates] = useState({});

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [availability, setAvailability] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getBaseRates().then((res) => {
      const map = {};
      res.data.forEach((r) => { map[r.category] = r; });
      setBaseRates(map);
    }).catch(() => {});
  }, []);

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleCheckAvailability = async () => {
    if (!selectedCategory || !checkIn || !checkOut) {
      setErrors({ avail: 'Please select a room type and both dates' });
      return;
    }
    setCheckingAvail(true);
    setAvailability(null);
    try {
      const res = await checkAvailability({ category: selectedCategory, check_in: checkIn, check_out: checkOut });
      setAvailability(res.data);
    } catch (err) {
      setErrors({ avail: 'Failed to check availability' });
    } finally {
      setCheckingAvail(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!selectedCategory) errs.room = 'Please select a room type';
    if (!guestName.trim()) errs.guestName = 'Name is required';
    if (!guestEmail.trim()) errs.guestEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errs.guestEmail = 'Invalid email';
    if (!guestPhone.trim()) errs.guestPhone = 'Phone is required';
    if (!checkIn) errs.checkIn = 'Check-in date is required';
    if (!checkOut) errs.checkOut = 'Check-out date is required';
    if (checkIn && checkOut && checkOut <= checkIn) errs.checkOut = 'Check-out must be after check-in';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await createBooking({
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        category: selectedCategory,
        check_in: checkIn,
        check_out: checkOut,
      });
      navigate('/booking/confirmation', { state: { booking: res.data } });
    } catch (err) {
      setErrors({ general: err.response?.data?.error || 'Booking failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryData = CATEGORIES.find((c) => c.value === selectedCategory);
  const baseRate = baseRates[selectedCategory]?.price || 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-navy-900 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-white">Complete Your Reservation</h1>
          <p className="text-gray-400 mt-1">Fill in your details to confirm your booking</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-5">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{errors.general}</span>
              </div>
            )}

            {/* Room Type Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-navy-900 text-lg mb-4 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-gold-500" />
                Select Room Type
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => { setSelectedCategory(cat.value); setAvailability(null); setErrors((p) => ({ ...p, room: '' })); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedCategory === cat.value ? 'border-navy-900 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="font-semibold text-navy-900 text-sm">{cat.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cat.desc}</div>
                    {baseRates[cat.value] && (
                      <div className="text-xs font-bold text-gold-600 mt-1">From ₹{baseRates[cat.value].price}/night</div>
                    )}
                  </button>
                ))}
              </div>
              {errors.room && <p className="text-red-500 text-xs mt-2">{errors.room}</p>}
            </div>

            {/* Stay Dates */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-navy-900 text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold-500" />
                Stay Dates
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Check-in Date</label>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => { setCheckIn(e.target.value); setAvailability(null); setErrors((p) => ({ ...p, checkIn: '' })); }}
                    className={`form-input ${errors.checkIn ? 'border-red-400' : ''}`}
                  />
                  {errors.checkIn && <p className="text-red-500 text-xs mt-1">{errors.checkIn}</p>}
                </div>
                <div>
                  <label className="form-label">Check-out Date</label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={(e) => { setCheckOut(e.target.value); setAvailability(null); setErrors((p) => ({ ...p, checkOut: '' })); }}
                    className={`form-input ${errors.checkOut ? 'border-red-400' : ''}`}
                  />
                  {errors.checkOut && <p className="text-red-500 text-xs mt-1">{errors.checkOut}</p>}
                </div>
              </div>

              {errors.avail && <p className="text-red-500 text-xs mt-2">{errors.avail}</p>}

              {selectedCategory && checkIn && checkOut && !availability && (
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={checkingAvail}
                  className="mt-3 flex items-center gap-2 text-sm text-navy-900 border border-navy-900 px-4 py-2 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50"
                >
                  {checkingAvail ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                  {checkingAvail ? 'Checking...' : 'Check Availability'}
                </button>
              )}

              {availability && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${availability.available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {availability.available ? (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-semibold">Available for {nights} night{nights !== 1 ? 's' : ''}</span>
                      <span className="text-green-800 font-bold flex items-center gap-0.5">
                        <IndianRupee className="w-3.5 h-3.5" />{availability.totalPrice?.toFixed(2)} total
                      </span>
                    </div>
                  ) : (
                    <p className="text-red-700 font-semibold">No rooms available for selected dates</p>
                  )}
                </div>
              )}
            </div>

            {/* Guest Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-navy-900 text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gold-500" />
                Guest Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); setErrors((p) => ({ ...p, guestName: '' })); }}
                    className={`form-input ${errors.guestName ? 'border-red-400' : ''}`}
                    placeholder="John Smith"
                  />
                  {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>}
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => { setGuestEmail(e.target.value); setErrors((p) => ({ ...p, guestEmail: '' })); }}
                    className={`form-input ${errors.guestEmail ? 'border-red-400' : ''}`}
                    placeholder="john@example.com"
                  />
                  {errors.guestEmail && <p className="text-red-500 text-xs mt-1">{errors.guestEmail}</p>}
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => { setGuestPhone(e.target.value); setErrors((p) => ({ ...p, guestPhone: '' })); }}
                    className={`form-input ${errors.guestPhone ? 'border-red-400' : ''}`}
                    placeholder="+91 98765 43210"
                  />
                  {errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone}</p>}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (availability && !availability.available)}
              className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <><Loader className="w-5 h-5 animate-spin" /> Processing Booking...</>
              ) : (
                'Confirm Reservation'
              )}
            </button>
          </div>

          {/* Right: Booking Summary */}
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h3 className="font-bold text-navy-900 mb-4">Booking Summary</h3>

              {selectedCategoryData ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="font-semibold text-navy-900">{selectedCategoryData.label}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{selectedCategoryData.desc}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Up to {selectedCategoryData.capacity} guests</span>
                    </div>
                  </div>

                  {checkIn && checkOut && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Check-in:</span>
                        <span className="font-medium">{new Date(checkIn + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Check-out:</span>
                        <span className="font-medium">{new Date(checkOut + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{nights} night{nights !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    {baseRate > 0 && nights > 0 && (
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>₹{baseRate}/night × {nights} nights</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-navy-900 text-lg mt-1">
                      <span>Estimated Total</span>
                      <span className="flex items-center gap-0.5">
                        <IndianRupee className="w-4 h-4" />
                        {availability?.totalPrice?.toFixed(2) || (baseRate > 0 && nights > 0 ? (baseRate * nights).toFixed(2) : '—')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">*Final price may vary based on dates</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <BedDouble className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a room type to see summary</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

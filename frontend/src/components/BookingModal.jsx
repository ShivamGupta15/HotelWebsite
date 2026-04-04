import React, { useState } from 'react';
import { X, User, Mail, Phone, Calendar, IndianRupee, Loader } from 'lucide-react';
import { createBooking, checkAvailability } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function BookingModal({ room, onClose }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
  });

  const [availability, setAvailability] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));

    if ((name === 'check_in' || name === 'check_out') && formData.check_in && formData.check_out) {
      setAvailability(null);
    }
  };

  const handleCheckAvailability = async () => {
    if (!formData.check_in || !formData.check_out) {
      setErrors({ check_in: 'Please select both check-in and check-out dates' });
      return;
    }
    setCheckingAvail(true);
    try {
      const res = await checkAvailability({
        category: room.category,
        check_in: formData.check_in,
        check_out: formData.check_out,
      });
      setAvailability(res.data);
    } catch (err) {
      setErrors({ general: 'Failed to check availability' });
    } finally {
      setCheckingAvail(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.guest_name.trim()) errs.guest_name = 'Name is required';
    if (!formData.guest_email.trim()) errs.guest_email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) errs.guest_email = 'Invalid email';
    if (!formData.guest_phone.trim()) errs.guest_phone = 'Phone is required';
    if (!formData.check_in) errs.check_in = 'Check-in date is required';
    if (!formData.check_out) errs.check_out = 'Check-out date is required';
    if (formData.check_in && formData.check_out && formData.check_out <= formData.check_in) {
      errs.check_out = 'Check-out must be after check-in';
    }
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
        ...formData,
        category: room.category,
        check_in: formData.check_in,
        check_out: formData.check_out,
      });
      navigate('/booking/confirmation', { state: { booking: res.data, room } });
    } catch (err) {
      setErrors({ general: err.response?.data?.error || 'Booking failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const nights =
    formData.check_in && formData.check_out
      ? Math.max(0, Math.round((new Date(formData.check_out) - new Date(formData.check_in)) / (1000 * 60 * 60 * 24)))
      : 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-navy-900">Book {room.category.charAt(0).toUpperCase() + room.category.slice(1)} Room</h2>
            <p className="text-sm text-gray-500 capitalize">{room.category} Room</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          {/* Guest Info */}
          <div>
            <label className="form-label">
              <User className="w-3.5 h-3.5 inline mr-1" /> Full Name
            </label>
            <input
              type="text"
              name="guest_name"
              value={formData.guest_name}
              onChange={handleChange}
              className={`form-input ${errors.guest_name ? 'border-red-400' : ''}`}
              placeholder="John Smith"
            />
            {errors.guest_name && <p className="text-red-500 text-xs mt-1">{errors.guest_name}</p>}
          </div>

          <div>
            <label className="form-label">
              <Mail className="w-3.5 h-3.5 inline mr-1" /> Email Address
            </label>
            <input
              type="email"
              name="guest_email"
              value={formData.guest_email}
              onChange={handleChange}
              className={`form-input ${errors.guest_email ? 'border-red-400' : ''}`}
              placeholder="john@example.com"
            />
            {errors.guest_email && <p className="text-red-500 text-xs mt-1">{errors.guest_email}</p>}
          </div>

          <div>
            <label className="form-label">
              <Phone className="w-3.5 h-3.5 inline mr-1" /> Phone Number
            </label>
            <input
              type="tel"
              name="guest_phone"
              value={formData.guest_phone}
              onChange={handleChange}
              className={`form-input ${errors.guest_phone ? 'border-red-400' : ''}`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.guest_phone && <p className="text-red-500 text-xs mt-1">{errors.guest_phone}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                <Calendar className="w-3.5 h-3.5 inline mr-1" /> Check-in
              </label>
              <input
                type="date"
                name="check_in"
                value={formData.check_in}
                min={today}
                onChange={handleChange}
                className={`form-input ${errors.check_in ? 'border-red-400' : ''}`}
              />
              {errors.check_in && <p className="text-red-500 text-xs mt-1">{errors.check_in}</p>}
            </div>
            <div>
              <label className="form-label">Check-out</label>
              <input
                type="date"
                name="check_out"
                value={formData.check_out}
                min={formData.check_in || today}
                onChange={handleChange}
                className={`form-input ${errors.check_out ? 'border-red-400' : ''}`}
              />
              {errors.check_out && <p className="text-red-500 text-xs mt-1">{errors.check_out}</p>}
            </div>
          </div>

          {/* Check Availability */}
          {formData.check_in && formData.check_out && !availability && (
            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={checkingAvail}
              className="w-full py-2.5 border-2 border-navy-900 text-navy-900 font-semibold rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkingAvail ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> Checking...
                </>
              ) : (
                'Check Availability'
              )}
            </button>
          )}

          {/* Availability Result */}
          {availability && (
            <div className={`p-4 rounded-lg ${availability.available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {availability.available ? (
                <div>
                  <p className="text-green-700 font-semibold">Room is available!</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-green-600">{nights} night{nights !== 1 ? 's' : ''}</span>
                    <div className="flex items-center text-green-800 font-bold">
                      <IndianRupee className="w-4 h-4" />
                      <span className="text-xl">{availability.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-red-700 font-semibold">Room is not available for selected dates</p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (availability && !availability.available)}
            className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

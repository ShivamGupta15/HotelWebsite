import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Calendar, User, Mail, Phone, BedDouble, IndianRupee, Home, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const statusColors = {
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
};

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, room } = location.state || {};

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No booking information found.</p>
            <Link to="/" className="btn-primary">Return Home</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const nights = Math.max(0, Math.round(
    (new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)
  ));

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-fadeIn">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500">
            Your reservation has been successfully made. A confirmation will be sent to your email.
          </p>
        </div>

        {/* Booking Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Header Strip */}
          <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-gold-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Booking Reference</div>
              <div className="text-white font-bold text-lg">#{booking.id.toString().padStart(6, '0')}</div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status] || 'bg-gray-100 text-gray-800'}`}>
              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Room Info */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center">
                <BedDouble className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <div className="font-bold text-navy-900 capitalize">{booking.category || room?.category} Room</div>
                <div className="text-sm text-gray-500 capitalize">{booking.category || room?.category} Room</div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-gray-100 rounded-xl">
                <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Check-in
                </div>
                <div className="font-semibold text-navy-900 text-sm">{formatDate(booking.check_in)}</div>
              </div>
              <div className="p-4 border border-gray-100 rounded-xl">
                <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Check-out
                </div>
                <div className="font-semibold text-navy-900 text-sm">{formatDate(booking.check_out)}</div>
              </div>
            </div>

            <div className="text-center bg-gold-50 border border-gold-100 rounded-xl py-3">
              <span className="text-gold-700 font-semibold">{nights} night{nights !== 1 ? 's' : ''} total stay</span>
            </div>

            {/* Guest Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-navy-900 text-sm uppercase tracking-wider">Guest Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{booking.guest_name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{booking.guest_email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{booking.guest_phone}</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-navy-900 text-lg">Total Amount</div>
                  <div className="text-sm text-gray-400">{nights} night{nights !== 1 ? 's' : ''} × room rate</div>
                </div>
                <div className="flex items-center text-2xl font-bold text-navy-900">
                  <IndianRupee className="w-5 h-5" />
                  {booking.total_price?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 text-sm mb-2">Important Information</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check-in time is 3:00 PM. Early check-in subject to availability.</li>
            <li>• Check-out time is 11:00 AM. Late check-out may incur additional charges.</li>
            <li>• Please bring valid photo ID upon check-in.</li>
            <li>• For cancellations, please contact us at least 48 hours in advance.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
          <Link
            to="/rooms"
            className="flex-1 flex items-center justify-center gap-2 border-2 border-navy-900 text-navy-900 hover:bg-navy-50 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Browse More Rooms
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi, UtensilsCrossed, Waves, Sparkles, ChevronRight,
  Star, ArrowRight, Calendar, Shield, Clock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const features = [
  { icon: Wifi, title: 'High-Speed WiFi', desc: 'Complimentary gigabit internet throughout the property' },
  { icon: Waves, title: 'Infinity Pool', desc: 'Heated outdoor pool with stunning panoramic city views' },
  { icon: Sparkles, title: 'Luxury Spa', desc: 'Full-service spa with rejuvenating treatments and therapies' },
  { icon: UtensilsCrossed, title: 'Fine Dining', desc: 'Award-winning restaurant serving global cuisine' },
  { icon: Shield, title: '24/7 Security', desc: 'Round-the-clock concierge and security services' },
  { icon: Clock, title: 'Flexible Check-in', desc: 'Express check-in and late checkout options available' },
];

const roomCategories = [
  {
    category: 'standard',
    title: 'Standard Rooms',
    desc: 'Comfortable and elegantly appointed rooms with all modern amenities for a relaxing stay.',
    price: 89,
    features: ['Queen or King Bed', 'City or Garden View', 'Work Desk', '42" Smart TV'],
    gradient: 'from-blue-600 to-blue-800',
    badge: 'bg-blue-100 text-blue-800',
  },
  {
    category: 'deluxe',
    title: 'Deluxe Rooms',
    desc: 'Spacious rooms with premium furnishings, upgraded amenities, and spectacular panoramic views.',
    price: 149,
    features: ['King Bed', 'Panoramic View', 'Sitting Area', 'Premium Minibar'],
    gradient: 'from-purple-600 to-purple-800',
    badge: 'bg-purple-100 text-purple-800',
  },
  {
    category: 'family',
    title: 'Family Suites',
    desc: 'Generous multi-room suites with separate living areas, perfect for families seeking luxury.',
    price: 199,
    features: ['Multiple Bedrooms', 'Full Kitchen', 'Living Room', 'Kids Amenities'],
    gradient: 'from-emerald-600 to-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800',
  },
];

const testimonials = [
  {
    name: 'Sarah Mitchell',
    location: 'New York, USA',
    rating: 5,
    text: 'An absolutely extraordinary experience. The staff went above and beyond to make our anniversary celebration truly memorable. The suite was magnificent!',
    avatar: 'SM',
  },
  {
    name: 'James Hartwell',
    location: 'London, UK',
    rating: 5,
    text: 'Rama Inn sets the gold standard for luxury hospitality. From the immaculate rooms to the exceptional dining, every detail was perfection.',
    avatar: 'JH',
  },
  {
    name: 'Yuki Tanaka',
    location: 'Tokyo, Japan',
    rating: 5,
    text: 'The family suite was perfect for our vacation. The kids loved the pool, and we appreciated the thoughtful amenities provided throughout our stay.',
    avatar: 'YT',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (checkIn) params.set('check_in', checkIn);
    if (checkOut) params.set('check_out', checkOut);
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #c9a96e 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, #1a2744 0%, transparent 50%)`,
            }}
          />
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 text-gold-300 text-sm px-4 py-2 rounded-full mb-8">
            <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
            <span>5-Star Luxury Hotel & Spa</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Luxury Awaits at{' '}
            <span className="text-gold-400 block">Rama Inn</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience unparalleled elegance and world-class hospitality in the heart of Beverly Hills. Your perfect stay begins here.
          </p>

          {/* Search Form */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-left">
                <label className="block text-xs text-gold-300 font-medium mb-1.5 uppercase tracking-wider">Check-in Date</label>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-white/90 text-navy-900 px-4 py-3 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div className="text-left">
                <label className="block text-xs text-gold-300 font-medium mb-1.5 uppercase tracking-wider">Check-out Date</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-white/90 text-navy-900 px-4 py-3 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full bg-gold-500 hover:bg-gold-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-gold-500/30 flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Search Rooms
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 max-w-lg mx-auto">
            {[
              { value: '500+', label: 'Happy Guests' },
              { value: '6', label: 'Room Types' },
              { value: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gold-400">{stat.value}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-block bg-gold-100 text-gold-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              World-Class Amenities
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Everything You Need for the Perfect Stay
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Rama Inn offers an unrivaled selection of amenities designed to make your stay extraordinary.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="group p-6 rounded-2xl border border-gray-100 hover:border-gold-200 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-navy-900 group-hover:bg-gold-500 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-navy-900 text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Room Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-block bg-navy-100 text-navy-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Our Accommodations
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Find Your Perfect Room
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              From cozy standard rooms to expansive family suites, every space is designed with your comfort in mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roomCategories.map((cat) => (
              <div key={cat.category} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group">
                <div className={`h-44 bg-gradient-to-br ${cat.gradient} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")'}}
                  />
                  <div className="text-center text-white relative z-10">
                    <div className="text-4xl font-bold mb-1">₹{cat.price}</div>
                    <div className="text-sm opacity-80">per night from</div>
                  </div>
                </div>

                <div className="p-6">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3 ${cat.badge}`}>
                    {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                  </span>
                  <h3 className="font-bold text-navy-900 text-xl mb-2">{cat.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">{cat.desc}</p>

                  <ul className="space-y-1.5 mb-5">
                    {cat.features.map((f, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-gold-500 rounded-full mr-2 flex-shrink-0"></div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate(`/rooms?category=${cat.category}`)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white font-semibold py-2.5 rounded-xl transition-all duration-200"
                  >
                    View Rooms
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-block bg-gold-500/20 text-gold-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Guest Reviews
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              What Our Guests Say
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Don't just take our word for it — hear from the guests who've experienced the Rama Inn difference.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-navy-800 rounded-2xl p-6 border border-navy-700">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-gold-600 to-gold-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Experience Luxury?
          </h2>
          <p className="text-gold-100 mb-8 text-lg">
            Book your stay today and discover why Rama Inn is the premier destination for discerning travelers.
          </p>
          <button
            onClick={() => navigate('/rooms')}
            className="bg-white text-gold-700 hover:bg-gold-50 font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg inline-flex items-center gap-2 text-lg"
          >
            Browse Available Rooms
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

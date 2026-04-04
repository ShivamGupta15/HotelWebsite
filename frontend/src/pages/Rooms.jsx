import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Loader, AlertCircle, SlidersHorizontal } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RoomCard from '../components/RoomCard';
import { getRooms } from '../services/api';

const CATEGORIES = [
  { value: '', label: 'All Rooms' },
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'family', label: 'Family Suite' },
];

export default function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');

  const today = new Date().toISOString().split('T')[0];

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (checkIn) params.check_in = checkIn;
      if (checkOut) params.check_out = checkOut;
      if (category) params.category = category;
      const res = await getRooms(params);
      setRooms(res.data);
    } catch (err) {
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSearch = () => {
    const params = {};
    if (checkIn) params.check_in = checkIn;
    if (checkOut) params.check_out = checkOut;
    if (category) params.category = category;
    setSearchParams(params);
    fetchRooms();
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Our Rooms & Suites</h1>
          <p className="text-gray-400">Discover the perfect space for your stay</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date Pickers */}
            <div className="flex flex-1 gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full form-input text-sm py-2.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full form-input text-sm py-2.5"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors self-end"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mt-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    category === cat.value
                      ? 'bg-navy-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Status Bar */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-sm">
              {rooms.length === 0
                ? 'No rooms found'
                : `${rooms.length} room${rooms.length !== 1 ? 's' : ''} available`}
              {checkIn && checkOut ? ` for ${checkIn} to ${checkOut}` : ''}
            </p>
            {(checkIn || checkOut || category) && (
              <button
                onClick={() => {
                  setCheckIn('');
                  setCheckOut('');
                  setCategory('');
                  setSearchParams({});
                  setTimeout(fetchRooms, 100);
                }}
                className="text-sm text-gold-600 hover:text-gold-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader className="w-10 h-10 text-navy-900 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading rooms...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <button onClick={fetchRooms} className="text-navy-900 hover:underline text-sm font-medium">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        {!loading && !error && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} checkIn={checkIn} checkOut={checkOut} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && rooms.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No rooms available</h3>
            <p className="text-gray-500 text-sm mb-4">
              {checkIn && checkOut
                ? 'No rooms are available for your selected dates. Try different dates.'
                : 'No rooms match your filters. Try adjusting your criteria.'}
            </p>
            <button
              onClick={() => {
                setCheckIn('');
                setCheckOut('');
                setCategory('');
                setSearchParams({});
                setTimeout(fetchRooms, 100);
              }}
              className="btn-secondary text-sm px-4 py-2"
            >
              View All Rooms
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Wifi, Tv, Wind, Coffee, ArrowRight, ImageOff } from 'lucide-react';

const categoryColors = {
  standard: 'bg-blue-100 text-blue-800',
  deluxe: 'bg-purple-100 text-purple-800',
  family: 'bg-green-100 text-green-800',
};

const categoryLabels = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  family: 'Family Suite',
};

function AmenityIcon({ amenity }) {
  const lower = amenity.toLowerCase();
  if (lower.includes('wifi')) return <Wifi className="w-3.5 h-3.5" />;
  if (lower.includes('tv')) return <Tv className="w-3.5 h-3.5" />;
  if (lower.includes('air') || lower.includes('conditioning')) return <Wind className="w-3.5 h-3.5" />;
  if (lower.includes('coffee') || lower.includes('bar')) return <Coffee className="w-3.5 h-3.5" />;
  return null;
}

export default function RoomCard({ room, checkIn, checkOut }) {
  const amenityList = room.amenities ? room.amenities.split(',').map((a) => a.trim()) : [];
  const displayAmenities = amenityList.slice(0, 4);

  const params = new URLSearchParams();
  if (checkIn) params.set('check_in', checkIn);
  if (checkOut) params.set('check_out', checkOut);
  const query = params.toString() ? `?${params.toString()}` : '';

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Room Image */}
      <div className="relative h-52 bg-gradient-to-br from-navy-100 to-navy-200 overflow-hidden">
        {room.primary_photo ? (
          <img
            src={`/uploads/${room.primary_photo}`}
            alt={`Room ${room.room_number}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImageOff className="w-12 h-12 text-navy-300 mb-2" />
            <span className="text-navy-400 text-sm">No photo available</span>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[room.category] || 'bg-gray-100 text-gray-800'}`}>
            {categoryLabels[room.category] || room.category}
          </span>
        </div>

      </div>

      {/* Room Info */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-navy-900 text-lg capitalize">{room.category} Room</h3>
            <div className="flex items-center text-gray-500 text-sm mt-0.5">
              <Users className="w-3.5 h-3.5 mr-1" />
              <span>Up to {room.capacity} guests</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-navy-900">
              ₹{room.base_price || '—'}
            </div>
            <div className="text-xs text-gray-400">per night</div>
          </div>
        </div>

        {/* Description */}
        {room.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">{room.description}</p>
        )}

        {/* Amenities */}
        {displayAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayAmenities.map((amenity, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded-md"
              >
                <AmenityIcon amenity={amenity} />
                {amenity}
              </span>
            ))}
            {amenityList.length > 4 && (
              <span className="inline-flex items-center bg-gray-50 border border-gray-200 text-gray-400 text-xs px-2 py-1 rounded-md">
                +{amenityList.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <Link
          to={`/rooms/${room.id}${query}`}
          className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 group/btn"
        >
          View Details
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

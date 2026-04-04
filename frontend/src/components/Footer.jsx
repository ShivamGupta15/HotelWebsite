import React from 'react';
import { Link } from 'react-router-dom';
import { Hotel, Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-9 h-9 bg-gold-500 rounded-lg flex items-center justify-center">
                <Hotel className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-lg leading-tight">Grand Vista</div>
                <div className="text-gold-400 text-xs font-medium leading-tight tracking-wider uppercase">Hotel</div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Experience luxury at its finest. Our award-winning hotel offers world-class amenities and unmatched hospitality.
            </p>
            <div className="flex space-x-3 mt-4">
              <a href="#" className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center hover:bg-gold-500 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center hover:bg-gold-500 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center hover:bg-gold-500 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/rooms', label: 'Our Rooms' },
                { to: '/booking', label: 'Book Now' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Room Types */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Room Types</h3>
            <ul className="space-y-2">
              {[
                { label: 'Standard Rooms', desc: 'From ₹89/night' },
                { label: 'Deluxe Rooms', desc: 'From ₹149/night' },
                { label: 'Family Suites', desc: 'From ₹199/night' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to="/rooms" className="group">
                    <div className="text-sm text-gray-400 hover:text-gold-400 transition-colors">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400">
                  123 Luxury Avenue<br />
                  Beverly Hills, CA 90210
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <a href="tel:+18001234567" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  +1 (800) 123-4567
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <a href="mailto:info@grandvista.com" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  info@grandvista.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Grand Vista Hotel. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-3 sm:mt-0">
            <a href="#" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Terms of Service</a>
            <Link to="/admin/login" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Staff Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

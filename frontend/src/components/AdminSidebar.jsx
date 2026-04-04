import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Hotel,
  LayoutDashboard,
  BedDouble,
  IndianRupee,
  Image,
  Users,
  CalendarRange,
  ClipboardList,
  UserCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '../App';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { to: '/admin/rates', label: 'Rates', icon: IndianRupee },
  { to: '/admin/photos', label: 'Photos', icon: Image },
  { to: '/admin/bulk-update', label: 'Bulk Update', icon: CalendarRange },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/offline-checkin', label: 'Offline Check-in', icon: UserCheck },
  { to: '/admin/booking-logs', label: 'Booking Logs', icon: ClipboardList },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 bg-navy-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-navy-700">
        <Link to="/admin/dashboard" className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-gold-500 rounded-lg flex items-center justify-center">
            <Hotel className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Grand Vista</div>
            <div className="text-gold-400 text-xs tracking-wider uppercase">Admin Panel</div>
          </div>
        </Link>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 mx-3 mt-4 bg-navy-800 rounded-xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.name}</div>
              <div className="text-gold-400 text-xs capitalize">{user.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-gold-500 text-white shadow-md'
                  : 'text-gray-300 hover:bg-navy-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <span>{item.label}</span>
              </div>
              {active && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-navy-700 space-y-1">
        <Link
          to="/"
          className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-all duration-200"
        >
          <Hotel className="w-4 h-4" />
          <span>View Hotel Site</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

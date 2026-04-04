import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, X, Check, CalendarRange,
  Loader, AlertCircle, IndianRupee, RotateCcw, Zap
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { bulkUpdateRates, getRates } from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORIES = [
  { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'deluxe', label: 'Deluxe', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'family', label: 'Family Suite', color: 'bg-green-100 text-green-800 border-green-200' },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function dateToString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function MonthCalendar({ year, month, selectedDates, overrideDates, onToggleDate, onDragStart, onDragEnter, dragging }) {
  const today = dateToString(new Date());
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className="select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPast = dateStr < today;
          const isSelected = selectedDates.has(dateStr);
          const hasOverride = overrideDates.has(dateStr);

          let cellClass = 'calendar-day';
          if (isPast) {
            cellClass += ' calendar-day-disabled opacity-30';
          } else if (isSelected) {
            cellClass += ' calendar-day-selected';
          } else if (hasOverride) {
            cellClass += ' calendar-day-has-override';
          } else {
            cellClass += ' hover:bg-navy-100';
          }

          return (
            <div
              key={dateStr}
              className={cellClass}
              onMouseDown={!isPast ? () => onDragStart(dateStr) : undefined}
              onMouseEnter={!isPast && dragging ? () => onDragEnter(dateStr) : undefined}
              onMouseUp={!isPast ? () => onToggleDate(dateStr) : undefined}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BulkUpdate() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set(['standard', 'deluxe', 'family']));
  const [price, setPrice] = useState('');
  const [overrideDates, setOverrideDates] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [priceError, setPriceError] = useState('');

  // Drag selection
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [pendingDates, setPendingDates] = useState(new Set());
  const dragModeRef = useRef('add'); // 'add' or 'remove'

  // Show two months
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  useEffect(() => {
    const fetchExistingRates = async () => {
      setFetchingRates(true);
      try {
        const res = await getRates();
        const dates = new Set(res.data.map((r) => r.date));
        setOverrideDates(dates);
      } catch (err) {
        console.error('Failed to fetch existing rates');
      } finally {
        setFetchingRates(false);
      }
    };
    fetchExistingRates();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragging) {
        setDragging(false);
        setDragStart(null);
        setPendingDates(new Set());
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [dragging]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDragStart = (dateStr) => {
    setDragging(true);
    setDragStart(dateStr);
    dragModeRef.current = selectedDates.has(dateStr) ? 'remove' : 'add';
    setPendingDates(new Set([dateStr]));
  };

  const handleDragEnter = (dateStr) => {
    if (!dragging) return;
    if (!dragStart) return;

    // Calculate range between dragStart and current
    const start = new Date(dragStart);
    const end = new Date(dateStr);
    const [from, to] = start <= end ? [start, end] : [end, start];

    const range = new Set();
    const cur = new Date(from);
    while (cur <= to) {
      range.add(dateToString(cur));
      cur.setDate(cur.getDate() + 1);
    }
    setPendingDates(range);

    // Apply immediately for visual feedback
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (dragModeRef.current === 'add') {
        range.forEach((d) => {
          const today = dateToString(new Date());
          if (d >= today) next.add(d);
        });
      } else {
        range.forEach((d) => next.delete(d));
      }
      return next;
    });
  };

  const handleToggleDate = useCallback((dateStr) => {
    if (!dragging) {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) {
          next.delete(dateStr);
        } else {
          next.add(dateStr);
        }
        return next;
      });
    }
    setDragging(false);
    setDragStart(null);
    setPendingDates(new Set());
  }, [dragging]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const selectAllDates = (monthYear) => {
    const { month, year } = monthYear;
    const todayStr = dateToString(new Date());
    const daysInMonth = getDaysInMonth(year, month);
    const newDates = new Set(selectedDates);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dateStr >= todayStr) newDates.add(dateStr);
    }
    setSelectedDates(newDates);
  };

  const clearDates = () => {
    setSelectedDates(new Set());
  };

  const handleSubmit = async () => {
    if (selectedDates.size === 0) {
      setError('Please select at least one date');
      return;
    }
    if (selectedCategories.size === 0) {
      setError('Please select at least one category');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setPriceError('Please enter a valid price');
      return;
    }

    setLoading(true);
    setError(null);
    setPriceError('');

    try {
      const dates = Array.from(selectedDates).sort();
      const categories = Array.from(selectedCategories);
      const res = await bulkUpdateRates({ categories, dates, price: parseFloat(price) });

      // Refresh override dates
      const ratesRes = await getRates();
      setOverrideDates(new Set(ratesRes.data.map((r) => r.date)));

      setSuccessMsg(`Successfully updated ${res.data.count} rate entries across ${dates.length} dates and ${categories.length} categories!`);
      setSelectedDates(new Set());
      setPrice('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  const sortedDates = Array.from(selectedDates).sort();

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-bold text-navy-900">Bulk Rate Update</h1>
          <p className="text-sm text-gray-500 mt-0.5">Select dates and categories to apply pricing in bulk</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="xl:col-span-2 space-y-4">
              {/* Calendar Navigation */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="flex gap-4 text-sm font-medium text-gray-500">
                    <span>{MONTHS[viewMonth]} {viewYear}</span>
                    <span className="text-gray-300">|</span>
                    <span>{MONTHS[nextMonth]} {nextYear}</span>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 bg-navy-900 rounded-full"></div>
                    <span className="text-gray-600">Selected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 bg-gold-200 rounded-full"></div>
                    <span className="text-gray-600">Has Override</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded-full opacity-50"></div>
                    <span className="text-gray-400">Past / Unavailable</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-4">Click to toggle. Click and drag to select a range.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Month 1 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-navy-900 text-sm">{MONTHS[viewMonth]} {viewYear}</h3>
                      <button
                        onClick={() => selectAllDates({ month: viewMonth, year: viewYear })}
                        className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                      >
                        Select all
                      </button>
                    </div>
                    <MonthCalendar
                      year={viewYear}
                      month={viewMonth}
                      selectedDates={selectedDates}
                      overrideDates={overrideDates}
                      onToggleDate={handleToggleDate}
                      onDragStart={handleDragStart}
                      onDragEnter={handleDragEnter}
                      dragging={dragging}
                    />
                  </div>

                  {/* Month 2 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-navy-900 text-sm">{MONTHS[nextMonth]} {nextYear}</h3>
                      <button
                        onClick={() => selectAllDates({ month: nextMonth, year: nextYear })}
                        className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                      >
                        Select all
                      </button>
                    </div>
                    <MonthCalendar
                      year={nextYear}
                      month={nextMonth}
                      selectedDates={selectedDates}
                      overrideDates={overrideDates}
                      onToggleDate={handleToggleDate}
                      onDragStart={handleDragStart}
                      onDragEnter={handleDragEnter}
                      dragging={dragging}
                    />
                  </div>
                </div>

                {/* Selected dates summary */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    <span className="font-bold text-navy-900">{selectedDates.size}</span> date{selectedDates.size !== 1 ? 's' : ''} selected
                  </span>
                  {selectedDates.size > 0 && (
                    <button
                      onClick={clearDates}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear selection
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Config & Preview */}
            <div className="space-y-5">
              {/* Category Selection */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-navy-900 mb-3">Apply to Categories</h3>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedCategories.has(cat.value)
                          ? 'border-navy-900 bg-navy-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat.value)}
                        onChange={() => toggleCategory(cat.value)}
                        className="w-4 h-4 accent-navy-900"
                      />
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedCategories.size === 0
                    ? 'No categories selected'
                    : `${selectedCategories.size} categor${selectedCategories.size !== 1 ? 'ies' : 'y'} selected`}
                </p>
              </div>

              {/* Price Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-navy-900 mb-3">New Price per Night</h3>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); setPriceError(''); }}
                    className={`form-input pl-8 text-lg font-bold ${priceError ? 'border-red-400' : ''}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {priceError && <p className="text-red-500 text-xs mt-1">{priceError}</p>}
                {price && parseFloat(price) > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    ₹{parseFloat(price).toFixed(2)} per night will be applied to selected dates
                  </div>
                )}
              </div>

              {/* Preview */}
              {selectedDates.size > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-navy-900 mb-3">Preview</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Dates:</span>
                      <span className="font-semibold text-navy-900">{selectedDates.size}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Categories:</span>
                      <span className="font-semibold text-navy-900">{selectedCategories.size}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Price:</span>
                      <span className="font-semibold text-navy-900">{price ? `₹${parseFloat(price).toFixed(2)}` : '—'}</span>
                    </div>
                    <div className="border-t pt-1.5 flex justify-between text-gray-600">
                      <span>Total entries:</span>
                      <span className="font-bold text-navy-900">{selectedDates.size * selectedCategories.size * (selectedCategories.size > 0 ? 2 : 0)}</span>
                    </div>
                  </div>

                  {/* Selected dates list (max 10) */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Selected Dates:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {sortedDates.slice(0, 10).map((d) => (
                        <div key={d} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{formatDate(d)}</span>
                          <button
                            onClick={() => setSelectedDates((prev) => { const n = new Set(prev); n.delete(d); return n; })}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {sortedDates.length > 10 && (
                        <p className="text-xs text-gray-400 italic">...and {sortedDates.length - 10} more dates</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || selectedDates.size === 0 || selectedCategories.size === 0 || !price}
                className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-bold py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
              >
                {loading ? (
                  <><Loader className="w-5 h-5 animate-spin" /> Applying...</>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Apply to {selectedDates.size} Date{selectedDates.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>

              {(selectedDates.size === 0 || selectedCategories.size === 0 || !price) && (
                <div className="text-center text-xs text-gray-400 space-y-0.5">
                  {selectedDates.size === 0 && <p>Select dates from the calendar</p>}
                  {selectedCategories.size === 0 && <p>Select at least one category</p>}
                  {!price && <p>Enter a price per night</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

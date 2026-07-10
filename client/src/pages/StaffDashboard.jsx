import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { staffService } from '../services';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, CheckCircle, TrendingUp, LogOut, Plus, X } from 'lucide-react';
import { getTodayDateString, formatTime } from '../utils';
import { useSocketEvent } from '../hooks';
import { useSocket } from '../context/SocketContext';

export const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  
  const getSmartDefaultTimeRange = () => {
    const now = new Date();
    const startHour = (now.getHours() + 1) % 24;
    const endHour = (startHour + 2) % 24;
    const startTime = `${String(startHour).padStart(2, '0')}:00`;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;
    return { startTime, endTime };
  };

  const [timeRanges, setTimeRanges] = useState([getSmartDefaultTimeRange()]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotDuration, setSlotDuration] = useState(5);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockStartTime, setBlockStartTime] = useState('11:00');
  const [blockEndTime, setBlockEndTime] = useState('11:30');
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isSlotTimeOver = (endTime) => {
    if (!endTime) return false;
    const [endHour, endMin] = endTime.split(':').map(Number);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = endHour * 60 + endMin;
    return currentMinutes >= endMinutes;
  };

  const filteredSlots = slots.filter(slot => {
    const isExpired = slot.status === 'expired' || isSlotTimeOver(slot.endTime);
    if (isExpired) return false;

    if (activeTab === 'all') {
      return true;
    }
    return slot.status === 'booked';
  });

  const handleSlotClick = (slot) => {
    if (slot.status === 'booked') {
      setSelectedSlot(slot);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await staffService.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await staffService.getAvailability();
      setSlots(response.data.data.slots);
      if (response.data.data.availability) {
        setTimeRanges(response.data.data.availability.timeRanges);
        setSlotDuration(response.data.data.availability.slotDuration || 5);
      }
    } catch (error) {
      console.error('Failed to fetch availability');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAvailability();
  }, []);

  useSocketEvent(socket, 'slot:booked', () => {
    fetchStats();
    fetchAvailability();
  });
  useSocketEvent(socket, 'slot:cancelled', () => {
    fetchStats();
    fetchAvailability();
  });
  useSocketEvent(socket, 'slot:expired', () => {
    fetchStats();
    fetchAvailability();
  });
  useSocketEvent(socket, 'availability:updated', () => {
    fetchStats();
    fetchAvailability();
  });

  const handleAddTimeRange = () => {
    setTimeRanges([...timeRanges, getSmartDefaultTimeRange()]);
  };

  const handleRemoveTimeRange = (index) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index, field, value) => {
    const newRanges = [...timeRanges];
    newRanges[index][field] = value;
    setTimeRanges(newRanges);
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await staffService.createAvailability({ 
        timeRanges, 
        slotDuration: Number(slotDuration) || 5 
      });
      toast.success('Availability published successfully!');
      fetchStats();
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockTimeRange = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to block all slots between ${blockStartTime} and ${blockEndTime}? Any active bookings in this range will be cancelled.`)) {
      return;
    }
    setBlocking(true);
    try {
      await staffService.blockSlots({ startTime: blockStartTime, endTime: blockEndTime });
      toast.success(`Blocked slots from ${blockStartTime} to ${blockEndTime} successfully!`);
      fetchStats();
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to block time range');
    } finally {
      setBlocking(false);
    }
  };

  const handleCloseBooking = async () => {
    if (!window.confirm('Are you sure you want to close bookings for today?')) return;
    try {
      await staffService.closeBooking();
      toast.success('Bookings closed for today');
      fetchStats();
      fetchAvailability();
    } catch (error) {
      toast.error('Failed to close bookings');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Staff Portal</h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
            <Calendar size={16} />
            <span className="text-sm font-medium">{getTodayDateString()}</span>
          </div>
        </div>
        <Button variant="danger" onClick={handleCloseBooking}>
          Close Today's Booking
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card title="Set Availability" subtitle="Define active hours for today">
            <form onSubmit={handleSaveAvailability} className="space-y-4">
              {timeRanges.map((range, index) => (
                <div key={index} className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl relative group">
                  {timeRanges.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTimeRange(index)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 z-10"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <TimeSelect 
                    label="Start Time" 
                    value={range.startTime} 
                    onChange={(val) => handleTimeChange(index, 'startTime', val)} 
                  />
                  <TimeSelect 
                    label="End Time" 
                    value={range.endTime} 
                    onChange={(val) => handleTimeChange(index, 'endTime', val)} 
                  />
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="secondary" 
                className="w-full flex items-center justify-center gap-2" 
                onClick={handleAddTimeRange}
              >
                <Plus size={16} /> Add Range
              </Button>
              
              <div className="flex flex-col gap-1 w-full text-left">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Slot Duration (Minutes)</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(e.target.value)}
                  onBlur={() => setSlotDuration(prev => Math.max(1, Math.min(120, Number(prev) || 5)))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter minutes (e.g. 3)"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-3 shadow-lg shadow-primary-500/20" 
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Availability'}
              </Button>
            </form>
          </Card>

          <Card title="Block Time Range" subtitle="Hide slots or cancel bookings for meetings/breaks">
            <form onSubmit={handleBlockTimeRange} className="space-y-4">
              <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <TimeSelect 
                  label="Start Time" 
                  value={blockStartTime} 
                  onChange={(val) => setBlockStartTime(val)} 
                />
                <TimeSelect 
                  label="End Time" 
                  value={blockEndTime} 
                  onChange={(val) => setBlockEndTime(val)} 
                />
              </div>
              <Button 
                type="submit" 
                variant="danger"
                className="w-full py-3 shadow-lg shadow-red-500/20" 
                disabled={blocking}
              >
                {blocking ? 'Blocking...' : 'Block Time Range'}
              </Button>
            </form>
          </Card>

          {stats && (
            <Card title="Today's Stats" subtitle="Booking overview">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Total</p>
                  <p className="text-2xl font-bold">{stats.totalSlots}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-center">
                  <p className="text-xs font-medium text-emerald-600 uppercase mb-1">Available</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.availableSlots}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-2xl text-center">
                  <p className="text-xs font-medium text-red-600 uppercase mb-1">Booked</p>
                  <p className="text-2xl font-bold text-red-600">{stats.bookedSlots}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-center">
                  <p className="text-xs font-medium text-blue-600 uppercase mb-1">Status</p>
                  <p className="text-sm font-bold text-blue-600">{stats.isActive ? 'Open' : 'Closed'}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-primary-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Generated Slots</h2>
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                All Slots
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('booked')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'booked'
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Booked Slots
              </button>
            </div>
          </div>

          {filteredSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <Calendar size={48} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {activeTab === 'all' ? 'No Slots Generated' : 'No Booked Slots'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {activeTab === 'all'
                    ? "Publish today's availability to generate 5-minute booking slots."
                    : 'There are no active booked slots at the moment.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredSlots.map(slot => (
                <div 
                  key={slot._id} 
                  onClick={() => handleSlotClick(slot)}
                  className={`p-3 border rounded-xl text-sm ${
                    slot.status === 'available' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                    slot.status === 'booked' ? 'bg-red-50 border-red-200 text-red-700 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]' : 
                    'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  <p className="font-bold">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</p>
                  <p className="text-[10px] uppercase font-medium opacity-70">
                    {slot.status === 'booked' 
                      ? (slot.bookedBy?.registrationNumber || 'Booked') 
                      : slot.status
                    }
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedSlot && selectedSlot.bookedBy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700 relative scale-in">
            <button 
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 border-b pb-3 border-slate-100 dark:border-slate-700">
              Booking Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registration Number</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedSlot.bookedBy.registrationNumber}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student Name</span>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{selectedSlot.bookedBy.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</span>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{selectedSlot.bookedBy.branch || 'CSE'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Section</span>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{selectedSlot.bookedBy.section || 'A'}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Number</span>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{selectedSlot.bookedBy.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Time</span>
                <p className="text-base font-bold text-primary-500">
                  {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between gap-4">
              <Button 
                variant="danger" 
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to cancel the booking for student ${selectedSlot.bookedBy.registrationNumber}?`)) {
                    try {
                      await staffService.staffCancelBooking(selectedSlot._id);
                      toast.success('Booking cancelled successfully!');
                      setSelectedSlot(null);
                      fetchStats();
                      fetchAvailability();
                    } catch (error) {
                      toast.error('Failed to cancel booking');
                    }
                  }
                }}
                className="px-4"
              >
                Cancel Booking
              </Button>
              <Button variant="secondary" onClick={() => setSelectedSlot(null)} className="px-5">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const parseTime24to12 = (time24) => {
  if (!time24) return { hour12: '12', minute: '00', period: 'AM' };
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return { 
    hour12: String(hour12), 
    minute: minuteStr, 
    period 
  };
};

const formatTime12to24 = (hour12, minute, period) => {
  let hour = parseInt(hour12);
  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

const TimeSelect = ({ label, value, onChange }) => {
  const { hour12, minute, period } = parseTime24to12(value);

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const handleChange = (field, newVal) => {
    let h = hour12;
    let m = minute;
    let p = period;
    if (field === 'hour') h = newVal;
    if (field === 'minute') m = newVal;
    if (field === 'period') p = newVal;
    onChange(formatTime12to24(h, m, p));
  };

  return (
    <div className="flex flex-col gap-1 w-full text-left">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex gap-2 items-center">
        {/* Hour Select */}
        <select
          value={hour12}
          onChange={(e) => handleChange('hour', e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer text-center"
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-slate-400 dark:text-slate-600 font-bold">:</span>
        {/* Minute Select */}
        <select
          value={minute}
          onChange={(e) => handleChange('minute', e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer text-center"
        >
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {/* AM/PM Select */}
        <select
          value={period}
          onChange={(e) => handleChange('period', e.target.value)}
          className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer text-center"
        >
          {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  );
};
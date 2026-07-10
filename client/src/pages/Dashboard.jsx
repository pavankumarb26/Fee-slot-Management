import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { SlotCard } from '../components/SlotCard';
import { slotService } from '../services';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent } from '../hooks';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, AlertCircle, History, User as UserIcon } from 'lucide-react';
import { formatTime, getTodayDateString } from '../utils';
import { useCountdown } from '../hooks';

export const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [slotsData, setSlotsData] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingClosed, setBookingClosed] = useState(false);

  const fetchSlots = async () => {
    try {
      const response = await slotService.getTodaySlots();
      setSlotsData(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBooking = async () => {
    try {
      const response = await slotService.getActiveBooking();
      setActiveBooking(response.data.data.booking);
    } catch (error) {
      setActiveBooking(null);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchSlots();
    fetchActiveBooking();
  }, []);

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

  const getCurrentServingSlot = () => {
    if (!slotsData?.slots) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotsData.slots.find(s => {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return currentMinutes >= startMin && currentMinutes < endMin;
    });
  };

  const getPeopleAheadCount = () => {
    if (!slotsData?.slots || !activeBooking?.slot) return 0;
    const mySlot = activeBooking.slot;
    const [myStartH, myStartM] = mySlot.startTime.split(':').map(Number);
    const myStartMin = myStartH * 60 + myStartM;

    return slotsData.slots.filter(s => {
      if (s.status !== 'booked') return false;
      
      const [startH, startM] = s.startTime.split(':').map(Number);
      const startMin = startH * 60 + startM;
      
      // Must be scheduled earlier than my slot today
      if (startMin >= myStartMin) return false;
      
      // Must not be expired/completed (time not over)
      return !isSlotTimeOver(s.endTime);
    }).length;
  };

  useSocketEvent(socket, 'slot:booked', () => {
    fetchSlots();
    fetchActiveBooking();
  });
  useSocketEvent(socket, 'slot:cancelled', () => {
    fetchSlots();
    fetchActiveBooking();
  });
  useSocketEvent(socket, 'slot:expired', () => {
    fetchSlots();
    fetchActiveBooking();
  });
  useSocketEvent(socket, 'availability:updated', () => {
    fetchSlots();
    fetchActiveBooking();
    setBookingClosed(false);
  });
  useSocketEvent(socket, 'booking:closed', () => {
    setBookingClosed(true);
    toast.error('Bookings have been closed by staff');
    fetchActiveBooking();
  });

  const handleBookSlot = async (slotId) => {
    try {
      const response = await slotService.bookSlot(slotId);
      toast.success(response.data.message || 'Slot booked successfully!');
      setActiveBooking(response.data.data.booking);
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await slotService.cancelBooking(bookingId);
      toast.success('Booking cancelled');
      setActiveBooking(null);
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cancellation failed');
    }
  };

  const activeSlots = slotsData?.slots 
    ? slotsData.slots.filter(s => s.status !== 'expired' && !isSlotTimeOver(s.endTime))
    : [];

  const passedSlots = slotsData?.slots
    ? slotsData.slots
        .filter(s => s.status === 'expired' || isSlotTimeOver(s.endTime))
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Fee Counter</h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
            <Calendar size={16} />
            <span className="text-sm font-medium">{getTodayDateString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2 flex items-center gap-3 border-primary-200 dark:border-primary-800">
            <div className="p-1.5 bg-primary-100 dark:bg-primary-900/50 rounded-lg text-primary-600 dark:text-primary-400">
              <UserIcon size={16} />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none">Attempts Left</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.bookingAttempts}</p>
            </div>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {activeBooking ? (
            <ActiveBookingCard 
              booking={activeBooking} 
              peopleAhead={getPeopleAheadCount()}
              onCancel={() => handleCancelBooking(activeBooking._id)}
            />
          ) : (
            <EmptyBookingCard />
          )}

          {/* Today's Counter Progress Card */}
          <Card title="Counter Progress" className="shadow-lg" subtitle="Today's passed slots">
            {passedSlots.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                No slots have passed yet today.
              </p>
            ) : (
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {passedSlots.map((item) => {
                  const isBooked = item.bookedBy != null;
                  return (
                    <div key={item._id} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {isBooked ? `Served: ${item.bookedBy.registrationNumber}` : 'Counter Free (Unused)'}
                        </p>
                      </div>
                      <Badge 
                        variant={isBooked ? 'success' : 'default'}
                        className="text-xs capitalize font-semibold"
                      >
                        {isBooked ? 'Served' : 'Free'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-500 rounded-xl text-white shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Quick Info</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Appointments are for 5 minutes. Please arrive 2 minutes before your slot to avoid delays.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-primary-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Today's Slots</h2>
            </div>
            {bookingClosed && (
              <Badge variant="danger" className="animate-pulse">Bookings Closed</Badge>
            )}
          </div>

          {(() => {
            const currentServingSlot = getCurrentServingSlot();
            if (!currentServingSlot) return null;
            return (
              <div className="p-4 bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Now Serving Slot</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatTime(currentServingSlot.startTime)} - {formatTime(currentServingSlot.endTime)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase leading-none mb-1 text-right">Student In Service</p>
                  <p className="text-sm font-bold text-primary-600 dark:text-primary-400 text-right">
                    {currentServingSlot.status === 'booked' 
                      ? (currentServingSlot.bookedBy?.registrationNumber || 'Booked') 
                      : 'Counter is Free'
                    }
                  </p>
                </div>
              </div>
            );
          })()}

          {!slotsData?.isBookingOpen || bookingClosed ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <Calendar size={48} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Slots Available</h3>
                <p className="text-slate-500 dark:text-slate-400">The fee counter is currently unavailable for bookings today.</p>
              </div>
            </div>
          ) : activeSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <Calendar size={48} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No Slots Available</h3>
                <p className="text-slate-500 dark:text-slate-400">All booking slots for today have completed or expired.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {activeSlots.map(slot => (
                <SlotCard 
                  key={slot._id}
                  slot={slot}
                  onBook={handleBookSlot}
                  isBookedByMe={slot.isBookedByMe}
                  disabled={slot.status !== 'available'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActiveBookingCard = ({ booking, peopleAhead, onCancel }) => {
  const { startTime, endTime } = booking.slot;
  const { hours, minutes, seconds, expired } = useCountdown(startTime);

  return (
    <Card className="p-6 border-primary-300 dark:border-primary-700 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upcoming Appointment</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your reserved slot</p>
        </div>
        <Badge variant="primary">Active</Badge>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-2xl text-primary-600 dark:text-primary-400">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {formatTime(startTime)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ending at {formatTime(endTime)}
          </p>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-700/50 rounded-2xl p-4 text-center mb-6 space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Starts In</p>
          {expired ? (
            <p className="text-lg font-bold text-red-500">Slot Expired</p>
          ) : (
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {hours > 0 ? `${hours}h ` : ''}{minutes}m {seconds}s
            </p>
          )}
        </div>
        
        {!expired && (
          <div className="border-t border-slate-200 dark:border-slate-650 pt-3 flex flex-col items-center justify-center space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none mb-1">Queue Status</p>
            <p className="text-sm font-bold text-primary-600 dark:text-primary-400 leading-none">
              {peopleAhead === 0 
                ? 'You are next in line!' 
                : `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead of you`
              }
            </p>
          </div>
        )}
      </div>

      <Button 
        variant="danger" 
        className="w-full py-3" 
        onClick={onCancel}
      >
        Cancel Appointment
      </Button>
    </Card>
  );
};

const EmptyBookingCard = () => (
  <Card className="p-6 text-center flex flex-col items-center justify-center py-12 space-y-4 border-dashed border-2 border-slate-300 dark:border-slate-600">
    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
      <Calendar size={32} />
    </div>
    <div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">No Active Booking</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">
        Select an available time slot from the grid to book your appointment.
      </p>
    </div>
  </Card>
);
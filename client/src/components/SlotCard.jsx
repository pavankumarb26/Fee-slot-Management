import React from 'react';
import { Badge, Button } from './UI';
import { formatTime, isSlotActive } from '../utils';
import { cn } from '../utils';

export const SlotCard = ({ slot, onBook, isBookedByMe, disabled }) => {
  const statusStyles = {
    available: 'slot-available border-emerald-200 dark:border-emerald-700',
    booked: 'slot-booked border-red-200 dark:border-red-700',
    expired: 'slot-expired border-slate-200 dark:border-slate-600',
    hidden: 'hidden',
  };

  const statusColors = {
    available: 'text-emerald-700 dark:text-emerald-400',
    booked: 'text-red-700 dark:text-red-400',
    expired: 'text-slate-500 dark:text-slate-400',
    hidden: '',
  };

  const isActive = isSlotActive(slot.startTime, slot.endTime);

  return (
    <div className={cn(
      'slot-card p-4 border rounded-2xl transition-all duration-200 flex flex-col justify-between gap-3',
      statusStyles[slot.status],
      isActive && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-800',
      disabled && 'slot-disabled opacity-60 cursor-not-allowed'
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Time Slot
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatTime(slot.startTime)}
          </p>
        </div>
        <Badge variant={slot.status === 'available' ? 'success' : slot.status === 'booked' ? 'danger' : 'default'} className={statusColors[slot.status]}>
          {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
        </Badge>
      </div>

      {isActive && (
        <div className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase animate-pulse">
          Current Slot
        </div>
      )}

      {(slot.status === 'available' && !disabled) && (
        <Button 
          variant="primary" 
          className="w-full py-2 text-sm" 
          onClick={() => onBook(slot._id)}
        >
          Book Now
        </Button>
      )}

      {isBookedByMe && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Your Appointment
        </div>
      )}
    </div>
  );
};
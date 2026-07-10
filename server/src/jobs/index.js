import { expireSlots } from '../services/bookingService.js';
import { getIO } from '../socket/index.js';

let expiryInterval = null;

export const startCronJobs = () => {
  console.log('Starting cron jobs...');
  
  expiryInterval = setInterval(async () => {
    try {
      const io = getIO();
      await expireSlots(io);
    } catch (error) {
      console.error('Error expiring slots:', error);
    }
  }, 60000);

  console.log('Slot expiry cron job started (runs every 60 seconds)');
};

export const stopCronJobs = () => {
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
  }
};
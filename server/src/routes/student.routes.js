import { Router } from 'express';
import { 
  getSlots, 
  book, 
  cancel, 
  getMyActiveBooking, 
  getHistory,
  getNotifications,
  markNotificationRead
} from '../controllers/studentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/slots/today', getSlots);
router.post('/slots/book/:slotId', book);
router.post('/slots/cancel/:bookingId', cancel);
router.get('/bookings/active', getMyActiveBooking);
router.get('/bookings/history', getHistory);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
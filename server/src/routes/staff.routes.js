import { Router } from 'express';
import { 
  createAvailabilitySlots, 
  close, 
  getAvailability,
  getStats,
  blockTimeRangeSlots,
  cancelStudentBooking
} from '../controllers/staffController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('staff', 'admin'));

router.post('/availability', createAvailabilitySlots);
router.get('/availability', getAvailability);
router.post('/close-booking', close);
router.post('/block-slots', blockTimeRangeSlots);
router.post('/cancel-booking/:slotId', cancelStudentBooking);
router.get('/stats', getStats);

export default router;
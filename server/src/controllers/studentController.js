import { 
  getTodaySlots, 
  bookSlot, 
  cancelBooking, 
  getActiveBooking,
  getBookingHistory,
  bookLastAvailableSlot
} from '../services/bookingService.js';

export const getSlots = async (req, res, next) => {
  try {
    const result = await getTodaySlots(req.user._id);
    
    if (!result.isBookingOpen) {
      return res.json({
        status: 'success',
        data: {
          slots: [],
          totalSlots: 0,
          availableSlots: 0,
          bookedSlots: 0,
          isBookingOpen: false,
          message: 'No booking available today'
        }
      });
    }

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const book = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { slotId } = req.params;
    
    const result = await bookSlot(slotId, req.user._id, io);
    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { bookingId } = req.params;
    
    const result = await cancelBooking(bookingId, req.user._id, io);
    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getMyActiveBooking = async (req, res, next) => {
  try {
    const booking = await getActiveBooking(req.user._id);
    res.json({ status: 'success', data: { booking } });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const { status } = req.query;
    const bookings = await getBookingHistory(req.user._id, status);
    res.json({ status: 'success', data: { bookings } });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    const notifications = await Notification.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ status: 'success', data: { notifications } });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};
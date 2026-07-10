import { createAvailability, closeBooking, getTodaySlots, blockSlotsInTimeRange, cancelBookingByStaff } from '../services/bookingService.js';
import { validate, availabilityValidation } from '../middleware/validator.js';
import Availability from '../models/Availability.js';
import { getTodayDate } from '../utils/slotGenerator.js';

export const createAvailabilitySlots = [
  validate(availabilityValidation),
  async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { timeRanges, slotDuration } = req.body;
      
      const result = await createAvailability(getTodayDate(), timeRanges, req.user._id, slotDuration);
      
      if (io) {
        io.emit('availability:updated', { slots: result.slots });
      }
      
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
];

export const close = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    await closeBooking(io);
    res.json({ status: 'success', message: 'Booking closed for today' });
  } catch (error) {
    next(error);
  }
};

export const getAvailability = async (req, res, next) => {
  try {
    const today = getTodayDate();
    const availability = await Availability.findOne({ date: today });
    
    if (!availability) {
      return res.json({
        status: 'success',
        data: { availability: null, slots: [] }
      });
    }
    
    const slotsData = await getTodaySlots();
    
    res.json({
      status: 'success',
      data: { 
        availability,
        slots: slotsData.slots,
        stats: {
          total: slotsData.totalSlots,
          available: slotsData.availableSlots,
          booked: slotsData.bookedSlots
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const today = getTodayDate();
    const availability = await Availability.findOne({ date: today });
    
    if (!availability) {
      return res.json({
        status: 'success',
        data: {
          totalSlots: 0,
          availableSlots: 0,
          bookedSlots: 0,
          isActive: false
        }
      });
    }
    
    const slotsData = await getTodaySlots();
    
    res.json({
      status: 'success',
      data: {
        totalSlots: slotsData.totalSlots,
        availableSlots: slotsData.availableSlots,
        bookedSlots: slotsData.bookedSlots,
        isActive: availability.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

export const blockTimeRangeSlots = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ status: 'fail', message: 'startTime and endTime are required' });
    }

    const result = await blockSlotsInTimeRange(startTime, endTime, io);

    if (io) {
      io.emit('availability:updated');
    }

    res.json({
      status: 'success',
      message: `Successfully blocked slots in range ${startTime} - ${endTime}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const cancelStudentBooking = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { slotId } = req.params;

    if (!slotId) {
      return res.status(400).json({ status: 'fail', message: 'slotId parameter is required' });
    }

    const result = await cancelBookingByStaff(slotId, io);

    res.json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
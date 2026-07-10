import TimeSlot from '../models/TimeSlot.js';
import Booking from '../models/Booking.js';
import Student from '../models/Student.js';
import Availability from '../models/Availability.js';
import Notification from '../models/Notification.js';
import { generateSlots, getTodayDate, resetDailyAttempts } from '../utils/slotGenerator.js';
import { AppError } from '../middleware/errorHandler.js';

export const createAvailability = async (date, timeRanges, staffId, slotDuration = 5) => {
  const today = getTodayDate();
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() !== today.getTime()) {
    throw new AppError('Can only create availability for today', 400);
  }

  // Cancel any active bookings for this date before resetting
  const bookedSlotsToCancel = await TimeSlot.find({ 
    date: targetDate, 
    bookedBy: { $ne: null } 
  });
  
  if (bookedSlotsToCancel.length > 0) {
    const bookedSlotIds = bookedSlotsToCancel.map(s => s._id);
    const bookingsToCancel = await Booking.find({ 
      slot: { $in: bookedSlotIds }, 
      status: 'active' 
    });
    
    if (bookingsToCancel.length > 0) {
      const studentIds = bookingsToCancel.map(b => b.student);
      await Student.updateMany(
        { _id: { $in: studentIds } },
        { $set: { bookingAttempts: 2, hasCancelledToday: false } }
      );
      await Booking.updateMany(
        { _id: { $in: bookingsToCancel.map(b => b._id) } },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
      );
    }
  }

  // Delete all existing slots for today so the schedule is completely fresh
  await TimeSlot.deleteMany({ date: targetDate });

  let availability = await Availability.findOne({ date: targetDate });
  
  if (availability) {
    availability.timeRanges = timeRanges;
    availability.slotDuration = slotDuration;
    availability.createdBy = staffId;
    availability.isActive = true; // Ensure bookings are open
    await availability.save();
  } else {
    availability = await Availability.create({
      date: targetDate,
      timeRanges,
      slotDuration,
      createdBy: staffId,
      isActive: true
    });
  }

  const slots = generateSlots(targetDate, timeRanges, slotDuration);
  const existingSlots = await TimeSlot.find({ date: targetDate });
  const existingTimesMap = new Set(existingSlots.map(s => `${s.startTime}-${s.endTime}`));

  const newSlots = slots.filter(s => !existingTimesMap.has(`${s.startTime}-${s.endTime}`));

  if (newSlots.length > 0) {
    await TimeSlot.insertMany(newSlots);
  }

  const createdSlots = await TimeSlot.find({ date: targetDate }).sort({ startTime: 1 });

  return { availability, slots: createdSlots };
};

export const closeBooking = async (io) => {
  const today = getTodayDate();
  
  // Mark all active bookings today as expired/cancelled because staff is closing counter operations
  const bookedSlotsToClose = await TimeSlot.find({ date: today, status: 'booked' });
  if (bookedSlotsToClose.length > 0) {
    const slotIds = bookedSlotsToClose.map(s => s._id);
    await Booking.updateMany(
      { slot: { $in: slotIds }, status: 'active' },
      { status: 'expired' }
    );
  }

  await TimeSlot.updateMany(
    { date: today, status: { $in: ['available', 'booked'] } },
    { status: 'hidden' }
  );

  await Availability.updateOne(
    { date: today },
    { isActive: false }
  );

  if (io) {
    io.emit('booking:closed', { 
      message: 'Bookings are now closed for today',
      closedAt: new Date()
    });
  }
};

export const getTodaySlots = async (studentId = null) => {
  const today = getTodayDate();
  
  const slots = await TimeSlot.find({ 
    date: today,
    status: { $in: ['available', 'booked', 'expired'] }
  }).sort({ startTime: 1 }).populate('bookedBy', 'name registrationNumber phone branch section');

  const student = studentId ? await Student.findById(studentId) : null;
  
  const result = [];
  for (const slot of slots) {
    if (slot.status !== 'expired' && slot.isExpired()) {
      if (slot.status === 'booked') {
        await Booking.findOneAndUpdate(
          { slot: slot._id, status: 'active' },
          { status: 'expired' }
        );
      }
      slot.status = 'expired';
      await slot.save();
    }
    const slotData = slot.toObject();
    slotData.isBookedByMe = studentId && slot.bookedBy?._id?.toString() === studentId.toString();
    result.push(slotData);
  }

  return {
    slots: result,
    totalSlots: result.length,
    availableSlots: result.filter(s => s.status === 'available').length,
    bookedSlots: result.filter(s => s.status === 'booked').length,
    isBookingOpen: await Availability.findOne({ date: today, isActive: true })
  };
};

export const bookSlot = async (slotId, studentId, io) => {
  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  resetDailyAttempts(student);
  await student.save();

  if (student.bookingAttempts <= 0) {
    throw new AppError('No booking attempts remaining today', 400);
  }

  const activeBooking = await Booking.findOne({ 
    student: studentId, 
    status: 'active',
    date: getTodayDate()
  }).populate('slot');

  if (activeBooking) {
    if (activeBooking.slot && activeBooking.slot.isExpired()) {
      activeBooking.status = 'expired';
      await activeBooking.save();
      
      const expiredSlot = await TimeSlot.findById(activeBooking.slot._id);
      if (expiredSlot) {
        expiredSlot.status = 'expired';
        await expiredSlot.save();
        if (io) {
          io.emit('slot:expired', { slotId: expiredSlot._id });
        }
      }
    } else {
      throw new AppError('You already have an active booking', 400);
    }
  }

  const slot = await TimeSlot.findById(slotId);
  if (!slot) throw new AppError('Slot not found', 404);
  
  const today = getTodayDate();
  slot.date.setHours(0, 0, 0, 0);
  if (slot.date.getTime() !== today.getTime()) {
    throw new AppError('Can only book today\'s slots', 400);
  }

  if (slot.status !== 'available') {
    throw new AppError('Slot is not available', 400);
  }

  const existingBooking = await TimeSlot.findOneAndUpdate(
    { _id: slotId, status: 'available' },
    { 
      status: 'booked', 
      bookedBy: studentId, 
      bookedAt: new Date() 
    },
    { new: true }
  );

  if (!existingBooking) {
    throw new AppError('Slot was already booked by someone else', 409);
  }

  const booking = await Booking.create({
    student: studentId,
    slot: slotId,
    date: getTodayDate(),
    status: 'active'
  });
  await booking.populate('slot');

  student.bookingAttempts -= 1;
  await student.save();

  await Notification.create({
    student: studentId,
    type: 'booking',
    title: 'Booking Confirmed',
    message: `Your appointment at ${slot.startTime} - ${slot.endTime} is confirmed`
  });

  if (io) {
    io.emit('slot:booked', { slot: existingBooking });
  }

  return { booking, slot: existingBooking };
};

export const cancelBooking = async (bookingId, studentId, io) => {
  const booking = await Booking.findOne({ 
    _id: bookingId, 
    student: studentId,
    status: 'active'
  }).populate('slot');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  const slot = await TimeSlot.findById(booking.slot._id);
  if (!slot) throw new AppError('Slot not found', 404);

  slot.status = 'available';
  slot.bookedBy = null;
  slot.bookedAt = null;
  await slot.save();

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  const student = await Student.findById(studentId);
  student.hasCancelledToday = true;
  student.lastCancelledAt = new Date();
  await student.save();

  await Notification.create({
    student: studentId,
    type: 'cancellation',
    title: 'Booking Cancelled',
    message: `Your appointment at ${slot.startTime} - ${slot.endTime} has been cancelled`
  });

  if (io) {
    io.emit('slot:cancelled', { slot });
  }

  return booking;
};

export const getActiveBooking = async (studentId) => {
  const booking = await Booking.findOne({
    student: studentId,
    status: 'active',
    date: getTodayDate()
  }).populate('slot');

  return booking;
};

export const getBookingHistory = async (studentId, status = null) => {
  const query = { student: studentId };
  if (status) query.status = status;
  
  const bookings = await Booking.find(query)
    .populate('slot')
    .sort({ createdAt: -1 });

  return bookings;
};

export const bookLastAvailableSlot = async (studentId, io) => {
  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  if (!student.hasCancelledToday) {
    throw new AppError('You can only auto-book after cancelling', 400);
  }

  const today = getTodayDate();
  const lastSlot = await TimeSlot.findOneAndUpdate(
    { 
      date: today, 
      status: 'available',
      _id: { $ne: null }
    },
    { 
      status: 'booked', 
      bookedBy: studentId, 
      bookedAt: new Date() 
    },
    { 
      sort: { startTime: -1 },
      new: true 
    }
  );

  if (!lastSlot) {
    throw new AppError('No slots available today', 400);
  }

  const booking = await Booking.create({
    student: studentId,
    slot: lastSlot._id,
    date: today,
    status: 'active'
  });
  await booking.populate('slot');

  student.hasCancelledToday = false;
  await student.save();

  if (io) {
    io.emit('slot:booked', { slot: lastSlot });
  }

  return { booking, slot: lastSlot };
};

export const expireSlots = async (io) => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const today = getTodayDate();
  
  const expiredSlots = await TimeSlot.find({
    date: today,
    status: 'available'
  });

  for (const slot of expiredSlots) {
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const slotEndMinutes = endHour * 60 + endMin;
    const [currHour, currMin] = currentTime.split(':').map(Number);
    const currMinutes = currHour * 60 + currMin;

    if (currMinutes > slotEndMinutes) {
      slot.status = 'expired';
      await slot.save();

      if (io) {
        io.emit('slot:expired', { slotId: slot._id });
      }
    }
  }

  const bookedSlots = await TimeSlot.find({
    date: today,
    status: 'booked'
  });

  for (const slot of bookedSlots) {
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const slotEndMinutes = endHour * 60 + endMin;
    const [currHour, currMin] = currentTime.split(':').map(Number);
    const currMinutes = currHour * 60 + currMin;

    if (currMinutes > slotEndMinutes) {
      await Booking.findOneAndUpdate(
        { slot: slot._id, status: 'active' },
        { status: 'expired' }
      );
      
      slot.status = 'expired';
      await slot.save();

      if (io) {
        io.emit('slot:expired', { slotId: slot._id });
      }
    }
  }
};

export const blockSlotsInTimeRange = async (startTime, endTime, io) => {
  const today = getTodayDate();
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const blockStartMinutes = startHour * 60 + startMin;
  const blockEndMinutes = endHour * 60 + endMin;

  if (blockStartMinutes >= blockEndMinutes) {
    throw new AppError('Start time must be before end time', 400);
  }

  // Find all slots for today sorted by startTime
  const allSlots = await TimeSlot.find({ date: today }).sort({ startTime: 1 });
  
  const slotsToHide = [];
  const bookedSlotsToReschedule = [];
  const availableSlotsLater = [];

  for (const slot of allSlots) {
    const [slotStartH, slotStartM] = slot.startTime.split(':').map(Number);
    const [slotEndH, slotEndM] = slot.endTime.split(':').map(Number);
    
    const slotStartMin = slotStartH * 60 + slotStartM;
    const slotEndMin = slotEndH * 60 + slotEndM;

    // Overlap condition: slot starts before block ends AND slot ends after block starts
    const overlaps = slotStartMin < blockEndMinutes && slotEndMin > blockStartMinutes;

    if (overlaps) {
      if (slot.status === 'booked' || slot.bookedBy) {
        bookedSlotsToReschedule.push(slot);
      }
      slot.status = 'hidden';
      slotsToHide.push(slot);
    } else {
      // Collect future available slots after the block range
      if (slotStartMin >= blockEndMinutes && slot.status === 'available') {
        availableSlotsLater.push(slot);
      }
    }
  }

  // Sort lists chronologically to ensure fair slot reassignment
  bookedSlotsToReschedule.sort((a, b) => {
    const [ah, am] = a.startTime.split(':').map(Number);
    const [bh, bm] = b.startTime.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  availableSlotsLater.sort((a, b) => {
    const [ah, am] = a.startTime.split(':').map(Number);
    const [bh, bm] = b.startTime.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  let rescheduledCount = 0;
  let cancelledCount = 0;
  let freeSlotIdx = 0;

  for (const oldSlot of bookedSlotsToReschedule) {
    const studentId = oldSlot.bookedBy;
    const booking = await Booking.findOne({ slot: oldSlot._id, status: 'active' });

    if (booking && studentId) {
      if (freeSlotIdx < availableSlotsLater.length) {
        // Reschedule to next available slot
        const newSlot = availableSlotsLater[freeSlotIdx];
        freeSlotIdx++;

        newSlot.status = 'booked';
        newSlot.bookedBy = studentId;
        await newSlot.save();

        booking.slot = newSlot._id;
        await booking.save();

        // Create in-app notification
        await Notification.create({
          student: studentId,
          type: 'booking',
          title: 'Appointment Rescheduled',
          message: `Your appointment has been rescheduled to ${newSlot.startTime} - ${newSlot.endTime} due to sudden staff work.`
        });

        rescheduledCount++;
      } else {
        // No slots left, cancel and refund attempts
        await Student.updateOne(
          { _id: studentId },
          { $set: { bookingAttempts: 2, hasCancelledToday: false } }
        );

        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        await booking.save();

        // Create cancellation notification
        await Notification.create({
          student: studentId,
          type: 'cancellation',
          title: 'Appointment Cancelled',
          message: 'Your appointment was cancelled because the staff blocked the slot and no other slots are available today.'
        });

        cancelledCount++;
      }
    }

    // Reset old slot and hide it
    oldSlot.bookedBy = null;
    oldSlot.status = 'hidden';
    await oldSlot.save();
  }

  // Hide remaining slots in range
  for (const slot of slotsToHide) {
    if (slot.status !== 'hidden') {
      slot.status = 'hidden';
      await slot.save();
    }
  }

  return {
    totalBooked: bookedSlotsToReschedule.length,
    rescheduledCount,
    cancelledCount
  };
};

export const cancelBookingByStaff = async (slotId, io) => {
  const slot = await TimeSlot.findById(slotId);
  if (!slot) {
    throw new AppError('Time slot not found', 404);
  }

  // Find active booking for this slot
  const booking = await Booking.findOne({ slot: slotId, status: 'active' });
  if (booking) {
    // Reset student attempts
    await Student.updateOne(
      { _id: booking.student },
      { $set: { bookingAttempts: 2, hasCancelledToday: false } }
    );

    // Cancel booking
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();
  }

  // Reset slot state
  slot.status = 'available';
  slot.bookedBy = null;
  await slot.save();

  if (io) {
    io.emit('slot:cancelled', { slot });
  }

  return { slot, booking };
};
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  slot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlot',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'completed'],
    default: 'active',
    index: true
  },
  bookedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

bookingSchema.index({ student: 1, date: 1 });
bookingSchema.index({ student: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
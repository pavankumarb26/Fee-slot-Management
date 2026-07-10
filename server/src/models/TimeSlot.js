import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'expired', 'hidden'],
    default: 'available',
    index: true
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  bookedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

timeSlotSchema.index({ date: 1, status: 1 });
timeSlotSchema.index({ date: 1, startTime: 1 });

timeSlotSchema.methods.isExpired = function() {
  const now = new Date();
  const [hours, minutes] = this.endTime.split(':').map(Number);
  const slotEnd = new Date(this.date);
  slotEnd.setHours(hours, minutes, 0, 0);
  return now > slotEnd;
};

timeSlotSchema.methods.getTimeRange = function() {
  return `${this.startTime} - ${this.endTime}`;
};

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;
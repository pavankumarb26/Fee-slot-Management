import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: String,
  phone: String,
  branch: {
    type: String,
    default: 'CSE'
  },
  section: {
    type: String,
    default: 'A'
  },
  bookingAttempts: {
    type: Number,
    default: 2
  },
  hasCancelledToday: {
    type: Boolean,
    default: false
  },
  lastCancelledAt: Date,
  lastResetDate: {
    type: Date,
    default: () => new Date(0)
  }
}, {
  timestamps: true
});

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

studentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

studentSchema.methods.resetDailyAttempts = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastReset = this.lastResetDate ? new Date(this.lastResetDate) : null;
  
  if (!lastReset || lastReset.getTime() < today.getTime()) {
    this.bookingAttempts = 2;
    this.hasCancelledToday = false;
    this.lastResetDate = today;
  }
  return this;
};

const Student = mongoose.model('Student', studentSchema);

export default Student;
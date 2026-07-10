import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');

    if (decoded.role === 'student') {
      const student = await Student.findById(decoded.userId);
      if (!student) {
        return next(new AppError('The student no longer exists.', 401));
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastReset = student.lastResetDate ? new Date(student.lastResetDate) : null;
      if (!lastReset || lastReset.getTime() < today.getTime()) {
        student.bookingAttempts = 2;
        student.hasCancelledToday = false;
        student.lastResetDate = today;
        await student.save();
      }

      req.user = { ...student.toObject(), role: 'student' };
    } else if (decoded.role === 'staff') {
      const staff = await Staff.findById(decoded.userId);
      if (!staff) {
        return next(new AppError('The staff no longer exists.', 401));
      }
      req.user = { ...staff.toObject(), role: 'staff' };
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
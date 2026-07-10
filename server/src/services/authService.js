import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';
import { AppError } from '../middleware/errorHandler.js';

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const parseRollNumber = (rollNumber) => {
  const cleanRoll = rollNumber.toUpperCase();
  let branch = 'CSE';
  let section = 'A';

  if (cleanRoll.includes('A05')) {
    branch = 'CSE';
  } else if (cleanRoll.includes('A04')) {
    branch = 'ECE';
  } else if (cleanRoll.includes('A03')) {
    branch = 'MECH';
  } else if (cleanRoll.includes('A02')) {
    branch = 'EEE';
  } else if (cleanRoll.includes('A01')) {
    branch = 'CIVIL';
  } else if (cleanRoll.includes('A12')) {
    branch = 'IT';
  }

  const lastTwo = parseInt(cleanRoll.slice(-2));
  if (!isNaN(lastTwo)) {
    if (lastTwo <= 60) {
      section = 'A';
    } else if (lastTwo <= 120) {
      section = 'B';
    } else {
      section = 'C';
    }
  }

  return { branch, section };
};

export const studentLogin = async (registrationNumber, password) => {
  const url = `https://register-api-green.vercel.app/attendance?student_id=${encodeURIComponent(registrationNumber)}&password=${encodeURIComponent(password)}`;
  
  let studentData;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new AppError('Verification server returned an error', 500);
    }
    
    const text = await response.json();
    const parsedData = typeof text === 'string' ? JSON.parse(text) : text;
    
    if (parsedData.error) {
      throw new AppError('Invalid credentials', 401);
    }
    
    const rollNumber = parsedData.roll_number ? parsedData.roll_number.replace(/^:/, '') : registrationNumber;
    const { branch, section } = parseRollNumber(rollNumber);
    studentData = {
      registrationNumber: rollNumber,
      name: `Student ${rollNumber}`,
      email: `${rollNumber}@college.edu`,
      phone: `+91 95421 ${Math.floor(10000 + Math.random() * 90000)}`,
      branch,
      section
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Invalid credentials', 401);
  }

  let student = await Student.findOne({ registrationNumber: studentData.registrationNumber });
  
  if (!student) {
    student = await Student.create({
      registrationNumber: studentData.registrationNumber,
      password: password || 'college-auth-managed',
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      branch: studentData.branch,
      section: studentData.section
    });
  } else {
    let needsUpdate = false;
    if (!student.branch || !student.section || !student.phone) {
      const { branch, section } = parseRollNumber(student.registrationNumber);
      if (!student.branch) { student.branch = branch; needsUpdate = true; }
      if (!student.section) { student.section = section; needsUpdate = true; }
      if (!student.phone) { student.phone = `+91 95421 ${Math.floor(10000 + Math.random() * 90000)}`; needsUpdate = true; }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = student.lastResetDate ? new Date(student.lastResetDate) : null;
    if (!lastReset || lastReset.getTime() < today.getTime()) {
      student.bookingAttempts = 2;
      student.hasCancelledToday = false;
      student.lastResetDate = today;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await student.save();
    }
  }

  const token = generateToken(student._id, 'student');
  
  return { student: { ...student.toObject(), role: 'student' }, token };
};

export const staffLogin = async (username, password) => {
  const staff = await Staff.findOne({ username });
  
  if (!staff) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await staff.comparePassword(password);
  
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken(staff._id, 'staff');
  
  return { staff, token };
};

export const logout = async (token) => {
  return { message: 'Logged out successfully' };
};
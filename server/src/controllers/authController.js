import { studentLogin, staffLogin, logout } from '../services/authService.js';
import { loginValidation, staffLoginValidation, validate } from '../middleware/validator.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';

export const login = [
  validate(loginValidation),
  async (req, res, next) => {
    try {
      const { registrationNumber, password } = req.body;
      const result = await studentLogin(registrationNumber, password);
      
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        status: 'success',
        token: result.token,
        data: { student: result.student }
      });
    } catch (error) {
      next(error);
    }
  }
];

export const staffLoginController = [
  validate(staffLoginValidation),
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const result = await staffLogin(username, password);
      
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        status: 'success',
        token: result.token,
        data: { staff: result.staff }
      });
    } catch (error) {
      next(error);
    }
  }
];

export const logoutController = async (req, res, next) => {
  try {
    res.clearCookie('token');
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.json({ status: 'success', data: { user: req.user } });
  } catch (error) {
    next(error);
  }
};
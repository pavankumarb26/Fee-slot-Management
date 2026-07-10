import { body, validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    res.status(400).json({
      status: 'fail',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  };
};

export const loginValidation = [
  body('registrationNumber')
    .trim()
    .notEmpty().withMessage('Registration number is required')
    .isLength({ min: 3 }).withMessage('Registration number must be at least 3 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

export const staffLoginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

export const availabilityValidation = [
  body('timeRanges')
    .isArray({ min: 1 }).withMessage('At least one time range is required'),
  body('timeRanges.*.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:mm)'),
  body('timeRanges.*.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:mm)'),
  body('slotDuration')
    .optional()
    .isInt({ min: 1, max: 120 }).withMessage('Slot duration must be between 1 and 120 minutes')
];
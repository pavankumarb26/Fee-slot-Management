import api from './api';

export const authService = {
  studentLogin: (data) => api.post('/auth/student/login', data),
  staffLogin: (data) => api.post('/auth/staff/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const slotService = {
  getTodaySlots: () => api.get('/student/slots/today'),
  bookSlot: (slotId) => api.post(`/student/slots/book/${slotId}`),
  cancelBooking: (bookingId) => api.post(`/student/slots/cancel/${bookingId}`),
  getActiveBooking: () => api.get('/student/bookings/active'),
  getBookingHistory: (status) => api.get('/student/bookings/history', { params: { status } }),
  getNotifications: () => api.get('/student/notifications'),
  markNotificationRead: (id) => api.put(`/student/notifications/${id}/read`),
};

export const staffService = {
  createAvailability: (data) => api.post('/staff/availability', data),
  getAvailability: () => api.get('/staff/availability'),
  closeBooking: () => api.post('/staff/close-booking'),
  getStats: () => api.get('/staff/stats'),
  blockSlots: (data) => api.post('/staff/block-slots', data),
  staffCancelBooking: (slotId) => api.post(`/staff/cancel-booking/${slotId}`),
};
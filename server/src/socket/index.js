import { expireSlots } from '../services/bookingService.js';

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (data) => {
      if (data.studentId) {
        socket.join(`student:${data.studentId}`);
      }
    });

    socket.on('leave', (data) => {
      if (data.studentId) {
        socket.leave(`student:${data.studentId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  io.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
};

let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;
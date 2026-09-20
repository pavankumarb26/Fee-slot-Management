import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import authRoutes from './src/routes/auth.routes.js';
import studentRoutes from './src/routes/student.routes.js';
import staffRoutes from './src/routes/staff.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { setupSocket } from './src/socket/index.js';
import { startCronJobs } from './src/jobs/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://fee-slot-management.vercel.app'
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const customOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(url => url.trim()).filter(Boolean)
    : [];
  const allowed = [...defaultOrigins, ...customOrigins];
  return allowed.includes(origin) || /\.vercel\.app$/.test(origin);
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased limit for local development/testing
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.set('io', io);

const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fee-booking';
    if (!process.env.MONGODB_URI) {
      console.warn('Warning: MONGODB_URI is not defined in environment variables. Falling back to local MongoDB.');
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();
  setupSocket(io);
  startCronJobs();
  
  httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
  });
};

startServer();

export { io };
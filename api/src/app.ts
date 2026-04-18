import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import { adminRoutes } from './routes/adminRoutes';
import { authRoutes } from './routes/authRoutes';
import { bookingRoutes } from './routes/bookingRoutes';
import { errorHandler } from './middleware/errorHandler';
import { metaRoutes } from './routes/metaRoutes';
import { notificationRoutes } from './routes/notificationRoutes';
import { ticketRoutes } from './routes/ticketRoutes';
import { tripRoutes } from './routes/tripRoutes';
import { userRoutes } from './routes/userRoutes';

dotenv.config();

export function createApp() {
  const app = express();
  const configuredOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowedOrigins = configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(express.json({ limit: '1mb' }));
  app.use(cors({ origin: "*" }));
  app.use(morgan('dev'));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/meta', metaRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/trips', tripRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(errorHandler);

  return app;
}
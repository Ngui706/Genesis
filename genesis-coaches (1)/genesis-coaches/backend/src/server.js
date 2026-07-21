import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : ['http://localhost:5173', 'https://genesis-two-gules.vercel.app'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        return allowed.toLowerCase() === origin.toLowerCase();
      });
      if (isAllowed || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Basic abuse protection on public endpoints (search, seat locking, registration)
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/auth/register', publicLimiter);
app.use('/api/seats', publicLimiter);
app.use('/api/schedules', publicLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'genesis-coaches-api' }));

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', bookingRoutes);
app.use('/api', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Genesis Coaches API running on port ${PORT}`));

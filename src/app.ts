import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import appointmentRoutes from './routes/appointments';
import sessionRoutes from './routes/sessions';
import referralRoutes from './routes/referrals';
import concernRoutes from './routes/concerns';
import announcementRoutes from './routes/announcements';
import resourceRoutes from './routes/resources';
import notificationRoutes from './routes/notifications';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'guidetrack-api', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/concerns', concernRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api', notFound);
app.use(errorHandler);

export default app;

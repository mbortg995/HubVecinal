import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import communityRoutes from './routes/communities.js';
import invitationRoutes from './routes/invitations.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
    })
  );
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/communities', communityRoutes);
  app.use('/api/invitations', invitationRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

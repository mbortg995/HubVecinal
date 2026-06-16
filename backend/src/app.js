import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import communityRoutes from './routes/communities.js';
import invitationRoutes from './routes/invitations.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, cb) {
        // Sin origin (curl, apps móviles) → permitido.
        if (!origin) return cb(null, true);
        // Orígenes configurados (producción) o cualquier localhost/127.0.0.1 (desarrollo).
        if (
          allowedOrigins.includes(origin) ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return cb(null, true);
        }
        return cb(null, false);
      },
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

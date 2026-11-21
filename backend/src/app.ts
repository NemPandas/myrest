import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { authRoutes, ownerRoutes } from './accounts.js';
import { config } from './config.js';
import { rows, pool } from './db.js';
import { handleError, HttpError, notFound } from './http.js';
import { adminProducts, publicProducts } from './products.js';
import { adminImages, publicImages } from './images.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxyHops);
app.use(helmet({ strictTransportSecurity: config.secureCookie ? undefined : false }));

app.get('/api/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await rows(pool, 'SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/products', publicProducts);
app.use('/api/media/images', publicImages);

app.use('/api/admin', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin') !== config.origin) {
    throw new HttpError(403, 'invalid_origin', 'A kérés forrása nem engedélyezett.');
  }
  next();
}, express.json({ limit: '512kb' }), cookieParser());

app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/products', adminProducts);
app.use('/api/admin/images', adminImages);
app.use('/api/admin', ownerRoutes);
app.use(() => notFound());
app.use(handleError);

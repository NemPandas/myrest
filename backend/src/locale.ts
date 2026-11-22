import { createRequire } from 'node:module';
import { isIP } from 'node:net';
import { Router } from 'express';

const require = createRequire(import.meta.url);
const geoip = require('geoip-country') as { lookup(ip: string): { country: string } | null };
export function localeForIp(ip: string) {
  const country = isIP(ip) ? geoip.lookup(ip)?.country || null : null;
  return { country, language: country === 'HU' ? 'hu' : 'de' };
}
export const localeRoutes = Router();
localeRoutes.get('/', (req, res) => {
  // IP and country never enter a shared cache or a third-party lookup service.
  res.set('Cache-Control', 'private, no-store');
  res.json(localeForIp(req.ip || req.socket.remoteAddress || ''));
});

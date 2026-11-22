import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.url().default('http://localhost:3001'),
  APP_ORIGINS: z.string().default(''),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  BREVO_API_KEY: z.string().optional(),
  EMAIL_FROM: z.email().optional(),
  EMAIL_FROM_NAME: z.string().default('MyRest'),
  ORDER_NOTIFY_EMAIL: z.email().optional(),
  BANK_BENEFICIARY: z.string().optional(),
  BANK_ACCOUNT: z.string().optional(),
  BANK_BIC: z.string().optional(),
  ORDER_SHIPPING_HUF: z.coerce.number().int().nonnegative().default(0),
  ORDER_SHIPPING_EUR: z.coerce.number().nonnegative().default(0),
  DB_TLS_CA_FILE: z.string().min(1).optional(),
}).parse(process.env);

const origin = new URL(env.APP_ORIGIN);
if (origin.origin !== env.APP_ORIGIN || !['http:', 'https:'].includes(origin.protocol)) {
  throw new Error('APP_ORIGIN must be an HTTP(S) origin without a trailing slash or path.');
}
if (env.NODE_ENV === 'production' && origin.protocol !== 'https:') {
  throw new Error('APP_ORIGIN must use HTTPS in production.');
}

const allowedOrigins = [env.APP_ORIGIN, ...env.APP_ORIGINS.split(',').map(value => value.trim()).filter(Boolean)];
for (const value of allowedOrigins) {
  const url = new URL(value);
  if (url.origin !== value || !['http:', 'https:'].includes(url.protocol) || (env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    throw new Error('APP_ORIGINS must contain HTTP(S) origins; production requires HTTPS.');
  }
}

export const config = {
  email: { apiKey: env.BREVO_API_KEY, from: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME, notify: env.ORDER_NOTIFY_EMAIL },
  bank: { beneficiary: env.BANK_BENEFICIARY, account: env.BANK_ACCOUNT, bic: env.BANK_BIC },
  shipping: { hu: env.ORDER_SHIPPING_HUF, de: env.ORDER_SHIPPING_EUR },
  allowedOrigins,
  host: env.HOST,
  port: env.PORT,
  origin: origin.origin,
  secureCookie: origin.protocol === 'https:',
  trustProxyHops: env.TRUST_PROXY_HOPS,
  uploadDir: resolve(env.UPLOAD_DIR),
  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_TLS_CA_FILE
      ? { ca: readFileSync(env.DB_TLS_CA_FILE), rejectUnauthorized: true, verifyIdentity: true }
      : undefined,
  },
};

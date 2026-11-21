import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.url().default('http://localhost:3001'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_TLS_CA_FILE: z.string().min(1).optional(),
}).parse(process.env);

const origin = new URL(env.APP_ORIGIN);
if (origin.origin !== env.APP_ORIGIN || !['http:', 'https:'].includes(origin.protocol)) {
  throw new Error('APP_ORIGIN must be an HTTP(S) origin without a trailing slash or path.');
}
if (env.NODE_ENV === 'production' && origin.protocol !== 'https:') {
  throw new Error('APP_ORIGIN must use HTTPS in production.');
}

export const config = {
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

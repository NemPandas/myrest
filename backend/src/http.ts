import type { ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function conflict(message: string): never {
  throw new HttpError(409, 'conflict', message);
}

export function notFound(): never {
  throw new HttpError(404, 'not_found', 'A keresett rekord nem található.');
}

export function invalid(message: string): never {
  throw new HttpError(422, 'invalid_input', message);
}

export const idSchema = z.string().regex(/^[1-9][0-9]{0,19}$/)
  .refine(value => BigInt(value) <= 18446744073709551615n);

export const pageSchema = z.object({
  limit: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100))
    .optional().transform(value => value ?? 20),
  offset: z.string().regex(/^\d{1,9}$/).transform(Number)
    .optional().transform(value => value ?? 0),
});

export const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    res.status(422).json({ error: {
      code: 'invalid_input',
      message: 'Érvénytelen bemeneti adat.',
      fields: error.issues.map(issue => ({ path: issue.path, message: issue.message })),
    } });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ error: { code: 'duplicate', message: 'Ez az egyedi érték már foglalt.' } });
    return;
  }
  if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) {
    res.status(409).json({ error: { code: 'concurrent_write', message: 'Párhuzamos módosítás történt. Próbáld újra.' } });
    return;
  }
  if (error.status >= 400 && error.status < 500) {
    res.status(error.status).json({ error: { code: 'invalid_request', message: 'A kérés nem dolgozható fel.' } });
    return;
  }
  console.error('Request failed', { name: error.name, code: error.code });
  res.status(500).json({ error: { code: 'internal_error', message: 'Belső szerverhiba.' } });
};

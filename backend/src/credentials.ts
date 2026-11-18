import { hash } from 'argon2';
import { z } from 'zod';

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const password = z.string().min(15).max(256);
export const hashPassword = (plain: string) => hash(plain);

import { createHash, randomBytes } from 'node:crypto';
import { verify } from 'argon2';
import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from './config.js';
import { email, hashPassword, password } from './credentials.js';
import { lastInsertId, pool, rows, transaction, write } from './db.js';
import { conflict, HttpError, idSchema, notFound, pageSchema } from './http.js';

const cookieName = config.secureCookie ? '__Host-myrest_session' : 'myrest_session';
const cookieOptions = {
  httpOnly: true,
  secure: config.secureCookie,
  sameSite: 'lax' as const,
  path: '/',
};
const sessionHours = 8;
const inviteHours = 24;
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const tokenHash = (value: string) => createHash('sha256').update(value).digest();
const newToken = () => randomBytes(32).toString('base64url');

const loginBody = z.strictObject({ email, password: z.string().min(1).max(256) });
const registerBody = z.strictObject({ email, password, token });
const role = z.enum(['owner', 'editor']);

type Admin = { id: string; email: string; role: z.infer<typeof role> };
type Account = Admin & { password_hash: string; disabled_at: Date | null };
const adminView = ({ id, email, role }: Admin) => ({ id, email, role });
const dummyPasswordHash = hashPassword(newToken());

function unauthorized() {
  return new HttpError(401, 'unauthorized', 'A belépéshez érvényes munkamenet szükséges.');
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const session = token.safeParse(req.cookies[cookieName]);
  if (!session.success) throw unauthorized();
  const digest = tokenHash(session.data);
  const [admin] = await rows<Admin>(pool, `
    SELECT a.id, a.email, a.role
    FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL
      AND s.expires_at > UTC_TIMESTAMP(6) AND a.disabled_at IS NULL
  `, [digest]);
  if (!admin) throw unauthorized();
  res.locals.admin = admin;
  res.locals.sessionHash = digest;
  next();
};

export function currentAdmin(res: Response): Admin {
  return res.locals.admin;
}

export const requireOwner: RequestHandler = (_req, res, next) => {
  if (currentAdmin(res).role !== 'owner') {
    throw new HttpError(403, 'forbidden', 'Tulajdonosi jogosultság szükséges.');
  }
  next();
};

const limited = { error: { code: 'rate_limited', message: 'Túl sok próbálkozás. Próbáld később.' } };
const windowMs = 15 * 60 * 1000;
const perIp = rateLimit({ windowMs, limit: 30, message: limited });
const perIdentity = rateLimit({
  windowMs,
  limit: 10,
  message: limited,
  keyGenerator: (_req, res) => res.locals.authKey,
});

function authKey(kind: 'login' | 'register'): RequestHandler {
  return (req, res, next) => {
    const input = (kind === 'login' ? loginBody : registerBody).parse(req.body);
    const identity = 'token' in input && typeof input.token === 'string' ? input.token : input.email;
    res.locals.authInput = input;
    res.locals.authKey = kind + ':' + tokenHash(identity).toString('hex');
    next();
  };
}

export const authRoutes = Router();
authRoutes.post('/login', perIp, authKey('login'), perIdentity, async (_req, res) => {
  const input: z.infer<typeof loginBody> = res.locals.authInput;
  const [account] = await rows<Account>(pool, `
    SELECT id, email, role, password_hash, disabled_at FROM admin_users WHERE email = ?
  `, [input.email]);
  const valid = await verify(account?.password_hash ?? await dummyPasswordHash, input.password);
  const failure = new HttpError(401, 'invalid_credentials', 'Érvénytelen belépési adatok.');
  if (!valid || !account || account.disabled_at) throw failure;

  const session = newToken();
  const admin = await transaction(async db => {
    const [current] = await rows<Account>(db, `
      SELECT id, email, role, password_hash, disabled_at FROM admin_users WHERE id = ? FOR UPDATE
    `, [account.id]);
    if (!current || current.disabled_at || current.password_hash !== account.password_hash) throw failure;
    await write(db, `
      INSERT INTO admin_sessions (token_hash, admin_id, expires_at, created_at)
      VALUES (?, ?, UTC_TIMESTAMP(6) + INTERVAL ${sessionHours} HOUR, UTC_TIMESTAMP(6))
    `, [tokenHash(session), current.id]);
    return adminView(current);
  });
  res.cookie(cookieName, session, { ...cookieOptions, maxAge: sessionHours * 3600_000 });
  res.json(admin);
});

authRoutes.post('/register', perIp, authKey('register'), perIdentity, async (_req, res) => {
  const input: z.infer<typeof registerBody> = res.locals.authInput;
  const invalidInvite = new HttpError(422, 'invalid_invite', 'A meghívó érvénytelen vagy már nem használható.');
  const digest = tokenHash(input.token);
  const inviteSql = `
    SELECT email, role FROM admin_invites WHERE token_hash = ? AND used_at IS NULL
      AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6)
  `;
  const [candidate] = await rows<Pick<Admin, 'email' | 'role'>>(pool, inviteSql, [digest]);
  if (!candidate || candidate.email !== input.email) throw invalidInvite;
  const hashed = await hashPassword(input.password);
  const admin = await transaction(async db => {
    const [invite] = await rows<Pick<Admin, 'email' | 'role'>>(db, inviteSql + ' FOR UPDATE', [digest]);
    if (!invite || invite.email !== input.email) throw invalidInvite;
    await write(db, `
      INSERT INTO admin_users (email, password_hash, role, created_at)
      VALUES (?, ?, ?, UTC_TIMESTAMP(6))
    `, [invite.email, hashed, invite.role]);
    const id = await lastInsertId(db);
    await write(db, 'UPDATE admin_invites SET used_at = UTC_TIMESTAMP(6) WHERE token_hash = ?', [digest]);
    return { id, ...invite };
  });
  res.status(201).json(admin);
});

authRoutes.get('/me', requireAdmin, (_req, res) => {
  res.json(currentAdmin(res));
});

authRoutes.post('/logout', requireAdmin, async (_req, res) => {
  await write(pool, `
    UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP(6)
    WHERE token_hash = ? AND revoked_at IS NULL
  `, [res.locals.sessionHash]);
  res.clearCookie(cookieName, cookieOptions);
  res.sendStatus(204);
});

export const ownerRoutes = Router();
ownerRoutes.use(requireAdmin, requireOwner);

ownerRoutes.get('/invites', async (req, res) => {
  const { limit, offset } = pageSchema.parse(req.query);
  const items = await rows(pool, `
    SELECT LOWER(HEX(token_hash)) AS id, email, role,
      CASE WHEN used_at IS NOT NULL THEN 'used' WHEN revoked_at IS NOT NULL THEN 'revoked'
           WHEN expires_at <= UTC_TIMESTAMP(6) THEN 'expired' ELSE 'active' END AS status
    FROM admin_invites ORDER BY created_at DESC, token_hash LIMIT ? OFFSET ?
  `, [limit, offset]);
  res.json({ items, limit, offset });
});

ownerRoutes.post('/invites', async (req, res) => {
  const input = z.strictObject({ email, role: role.default('editor') }).parse(req.body);
  const raw = newToken();
  const digest = tokenHash(raw);
  const [existing] = await rows(pool, 'SELECT id FROM admin_users WHERE email = ?', [input.email]);
  if (existing) conflict('Ehhez az e-mail-címhez már tartozik fiók.');
  await write(pool, `
    INSERT INTO admin_invites (token_hash, email, role, invited_by, expires_at, created_at)
    VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6) + INTERVAL ${inviteHours} HOUR, UTC_TIMESTAMP(6))
  `, [digest, input.email, input.role, currentAdmin(res).id]);
  res.status(201).json({ id: digest.toString('hex'), ...input, token: raw, expiresInHours: inviteHours });
});

ownerRoutes.post('/invites/:id/revoke', async (req, res) => {
  const id = z.string().regex(/^[a-fA-F0-9]{64}$/).parse(req.params.id);
  await transaction(async db => {
    const digest = Buffer.from(id, 'hex');
    const [invite] = await rows<{ used_at: Date | null; revoked_at: Date | null }>(
      db, 'SELECT used_at, revoked_at FROM admin_invites WHERE token_hash = ? FOR UPDATE', [digest],
    );
    if (!invite) notFound();
    if (invite.used_at) conflict('A meghívót már felhasználták.');
    if (!invite.revoked_at) {
      await write(db, 'UPDATE admin_invites SET revoked_at = UTC_TIMESTAMP(6) WHERE token_hash = ?', [digest]);
    }
  });
  res.sendStatus(204);
});

ownerRoutes.get('/users', async (req, res) => {
  const { limit, offset } = pageSchema.parse(req.query);
  const items = await rows(pool, `
    SELECT id, email, role, disabled_at, created_at FROM admin_users ORDER BY id LIMIT ? OFFSET ?
  `, [limit, offset]);
  res.json({ items, limit, offset });
});

ownerRoutes.patch('/users/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const input = z.strictObject({ role: role.optional(), active: z.boolean().optional() })
    .refine(value => Object.keys(value).length > 0).parse(req.body);
  const actor = currentAdmin(res);
  const result = await transaction(async db => {
    const [currentActor] = await rows<Pick<Account, 'role' | 'disabled_at'>>(db,
      'SELECT role, disabled_at FROM admin_users WHERE id = ? FOR UPDATE', [actor.id]);
    if (currentActor?.role !== 'owner' || currentActor.disabled_at) {
      throw new HttpError(403, 'forbidden', 'Tulajdonosi jogosultság szükséges.');
    }
    const [target] = await rows<Admin & Pick<Account, 'disabled_at'>>(db, `
      SELECT id, email, role, disabled_at FROM admin_users WHERE id = ? FOR UPDATE
    `, [id]);
    if (!target) notFound();
    const nextRole = input.role ?? target.role;
    const active = input.active ?? !target.disabled_at;
    if (target.role === 'owner' && !target.disabled_at && (nextRole !== 'owner' || !active)) {
      const [another] = await rows(db, `
        SELECT id FROM admin_users WHERE role = 'owner' AND disabled_at IS NULL AND id <> ? LIMIT 1 FOR UPDATE
      `, [id]);
      if (!another) conflict('Legalább egy aktív tulajdonosi fióknak meg kell maradnia.');
    }
    if (nextRole !== target.role || active !== !target.disabled_at) {
      await write(db, `
        UPDATE admin_users SET role = ?,
          disabled_at = CASE WHEN ? THEN NULL ELSE COALESCE(disabled_at, UTC_TIMESTAMP(6)) END WHERE id = ?
      `, [nextRole, Number(active), id]);
      await write(db, `
        UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE admin_id = ? AND revoked_at IS NULL
      `, [id]);
    }
    return { ...adminView(target), role: nextRole, active };
  }, { ownerLock: true });
  res.json(result);
});

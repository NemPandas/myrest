import { pool, write } from './db.js';

try {
  const result = await write(pool, `
    DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP(6) OR revoked_at IS NOT NULL
  `);
  console.log('Removed sessions:', result.affectedRows);
} catch {
  console.error('Could not remove expired sessions.');
  process.exitCode = 1;
} finally {
  await pool.end();
}

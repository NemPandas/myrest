import { email, hashPassword, password } from './credentials.js';
import { pool, rows, transaction, write } from './db.js';

try {
  const address = email.parse(process.argv[2]);
  if (process.stdin.isTTY) {
    throw new Error('Pipe the owner password to this command on stdin.');
  }
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 514) throw new Error('Owner password input is too long.');
  }
  const hashed = await hashPassword(password.parse(input.replace(/\r?\n$/, '')));
  await transaction(async db => {
    const [existing] = await rows(db, 'SELECT id FROM admin_users LIMIT 1 FOR UPDATE');
    if (existing) throw new Error('Initial owner creation is only available before the first admin account.');
    await write(db, `
      INSERT INTO admin_users (email, password_hash, role, created_at)
      VALUES (?, ?, 'owner', UTC_TIMESTAMP(6))
    `, [address, hashed]);
  }, { ownerLock: true });
  console.log('Initial owner created.');
} catch (error) {
  console.error('Could not create owner.', error instanceof Error && error.name === 'Error' ? error.message : '');
  process.exitCode = 1;
} finally {
  await pool.end();
}

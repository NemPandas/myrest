import { createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { ExecuteValues } from 'mysql2';
import { config } from './config.js';
import { conflict } from './http.js';

export const pool = mysql.createPool({
  ...config.database,
  charset: 'utf8mb4',
  timezone: 'Z',
  supportBigNumbers: true,
  bigNumberStrings: true,
  connectionLimit: 10,
  queueLimit: 100,
});

type Db = typeof pool | PoolConnection;

export async function rows<T>(db: Db, sql: string, parameters: ExecuteValues = []): Promise<T[]> {
  const [result] = await db.execute<(RowDataPacket & T)[]>(sql, parameters);
  return result;
}

export async function write(db: Db, sql: string, parameters: ExecuteValues = []) {
  const [result] = await db.execute<ResultSetHeader>(sql, parameters);
  return result;
}

export async function lastInsertId(db: PoolConnection) {
  const [row] = await rows<{ id: string }>(db, 'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id');
  return row.id;
}

const ownerLockName = 'myrest:owners:' + createHash('sha256')
  .update(config.database.database).digest('hex').slice(0, 40);

export async function transaction<T>(
  work: (connection: PoolConnection) => Promise<T>,
  options: { ownerLock?: boolean; snapshot?: boolean } = {},
): Promise<T> {
  const connection = await pool.getConnection();
  let hasLock = false;
  let reusable = true;
  try {
    if (options.ownerLock) {
      const [row] = await rows<{ acquired: string | null }>(
        connection, 'SELECT CAST(GET_LOCK(?, 5) AS CHAR) AS acquired', [ownerLockName],
      );
      if (row.acquired !== '1') conflict('A fiókkezelés foglalt. Próbáld újra.');
      hasLock = true;
    }
    if (options.snapshot) {
      await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    } else {
      await connection.beginTransaction();
    }
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      reusable = false;
    }
    throw error;
  } finally {
    try {
      if (hasLock) {
        const [row] = await rows<{ released: string | null }>(
          connection, 'SELECT CAST(RELEASE_LOCK(?) AS CHAR) AS released', [ownerLockName],
        );
        reusable &&= row.released === '1';
      }
    } catch {
      reusable = false;
    } finally {
      if (reusable) connection.release();
      else connection.destroy();
    }
  }
}

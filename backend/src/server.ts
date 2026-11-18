import { app } from './app.js';
import { config } from './config.js';
import { pool, rows } from './db.js';

try {
  await rows(pool, 'SELECT id FROM products LIMIT 0');
  await rows(pool, 'SELECT id FROM admin_users LIMIT 0');
  const server = app.listen(config.port, config.host, () => {
    console.log('MyRest API listening on', config.host + ':' + config.port);
  });
  server.once('error', async (error: NodeJS.ErrnoException) => {
    console.error('Could not listen.', error.code);
    process.exitCode = 1;
    await pool.end();
  });
  const shutdown = () => {
    const timer = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 10_000);
    timer.unref();
    server.close(async error => {
      await pool.end();
      clearTimeout(timer);
      if (error) process.exitCode = 1;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('Database startup check failed.', (error as NodeJS.ErrnoException).code);
  process.exitCode = 1;
  await pool.end();
}

import { emailReady, processOrderEmails } from './orders.js';
import { sendOrderEmail } from './order-email.js';
import { app } from './app.js';
import { config } from './config.js';
import { pool, rows } from './db.js';

try {
  await rows(pool, 'SELECT id FROM products LIMIT 0');
  await rows(pool, 'SELECT id FROM admin_users LIMIT 0');
  await rows(pool, 'SELECT id FROM orders LIMIT 0');
  await rows(pool, 'SELECT order_id FROM order_emails LIMIT 0');
  let sending = false;
  let stopping = false;
  const sendPending = async () => {
    if (!emailReady() || sending || stopping) return;
    sending = true;
    try { await processOrderEmails(sendOrderEmail); }
    catch { console.error('Order email worker failed; retrying on next interval'); }
    finally { sending = false; }
  };
  const emailTimer = setInterval(() => { void sendPending(); }, 30000);
  emailTimer.unref();
  void sendPending();
  const server = app.listen(config.port, config.host, () => {
    console.log('MyRest API listening on', config.host + ':' + config.port);
  });
  server.once('error', async (error: NodeJS.ErrnoException) => {
    clearInterval(emailTimer);
    stopping = true;
    console.error('Could not listen.', error.code);
    process.exitCode = 1;
    await pool.end();
  });
  const shutdown = () => {
    stopping = true;
    clearInterval(emailTimer);
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

import { pool } from './db.js';
import { emailReady, processOrderEmails } from './orders.js';
import { sendOrderEmail } from './order-email.js';
try { if (emailReady()) await processOrderEmails(sendOrderEmail); }
finally { await pool.end(); }

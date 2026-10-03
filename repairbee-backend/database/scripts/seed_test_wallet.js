require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("UPDATE users SET wallet_balance = 2000 WHERE email = 'testcustomer@repairbee.com' RETURNING wallet_balance").then(r => {
  console.log('✅ Wallet set to: ₹' + r.rows[0].wallet_balance);
  pool.end();
}).catch(e => { console.error('❌', e.message); pool.end(); });

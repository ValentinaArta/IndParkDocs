require('dotenv').config({ path: __dirname + '/../.env' });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  const hash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO users (username, password_hash, role, display_name)
       VALUES ($1, $2, 'admin', 'Администратор')
       ON CONFLICT (username) DO UPDATE SET password_hash=$2`,
      [username, hash]
    );
    console.log(`Admin created: ${username} / ${password}`);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin().catch(e => { console.error(e); process.exit(1); });

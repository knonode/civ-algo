const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' }); // Load .env.local

const connectionString = process.env.DATABASE_URL;

console.log('Attempting to connect with script...');
console.log('DATABASE_URL loaded:', connectionString ? connectionString.substring(0, 30) + '...' : 'Not loaded!');

if (!connectionString) {
  console.error('Error: DATABASE_URL not found in environment variables. Check .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Keep the SSL setting we tried
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to database via script:', err);
  } else {
    console.log('Successfully connected to database via script! Result:', res.rows[0]);
  }
  pool.end(); // Close the connection pool
}); 
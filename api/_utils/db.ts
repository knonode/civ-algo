import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Add SSL configuration if required by your DB provider (e.g., Vercel Postgres)
      // ssl: {
      //   rejectUnauthorized: false 
      // }
    });

    // Optional: Test connection on creation (consider impact on cold starts)
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Error connecting to database:', err.stack);
      } else {
        console.log('Database pool initialized.');
      }
    });
  }
  return pool;
} 
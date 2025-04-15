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
  }
  return pool;
} 
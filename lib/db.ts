import { Pool } from 'pg';

// Singleton pool for database connections
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.RAILWAY_DATABASE_PUBLIC_URL,
    });
  }
  return pool;
}

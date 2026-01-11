/**
 * Run Supabase migrations from command line
 *
 * Usage:
 *   npx tsx scripts/run-migration.ts
 *
 * Requires DATABASE_URL in .env.local (get from Supabase Dashboard > Settings > Database)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

async function checkTableExists(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return false;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase.from('commits').select('sha').limit(1);

  if (!error) return true;

  // Check for various "table not found" error patterns
  const notFoundPatterns = [
    'does not exist',
    'Could not find the table',
    'relation "commits" does not exist',
    'PGRST205',
  ];

  const isNotFound = notFoundPatterns.some(p => error.message?.includes(p) || error.code === p);
  return !isNotFound;
}

async function runWithPg() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return false;
  }

  try {
    // Dynamic import pg
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });

    await client.connect();

    const migrationPath = path.join(__dirname, '../supabase/migrations/001_commits_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Running migration via direct postgres connection...');
    await client.query(sql);
    await client.end();

    console.log('✓ Migration complete!');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Postgres connection failed:', message);
    return false;
  }
}

async function runMigration() {
  console.log('=== Supabase Migration Runner ===\n');

  // First check if table already exists
  const exists = await checkTableExists();
  if (exists) {
    console.log('✓ commits table already exists!');

    // Get row count
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { count } = await supabase.from('commits').select('*', { count: 'exact', head: true });
    console.log(`  Current rows: ${count || 0}`);
    return;
  }

  console.log('commits table does not exist. Attempting to create...\n');

  // Try DATABASE_URL approach first
  if (process.env.DATABASE_URL) {
    const success = await runWithPg();
    if (success) return;
  }

  // Fallback: provide instructions
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_commits_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('To run this migration, choose one option:\n');
  console.log('OPTION 1: Add DATABASE_URL to .env.local');
  console.log('  1. Go to Supabase Dashboard > Project Settings > Database');
  console.log('  2. Copy the "Connection string" (URI format)');
  console.log('  3. Add to .env.local: DATABASE_URL=postgres://...');
  console.log('  4. Run: npm install pg && npx tsx scripts/run-migration.ts\n');

  console.log('OPTION 2: Run in Supabase SQL Editor');
  console.log('  1. Go to Supabase Dashboard > SQL Editor');
  console.log('  2. Paste and run this SQL:\n');
  console.log('---');
  console.log(sql);
  console.log('---');
}

runMigration().catch(console.error);

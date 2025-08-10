/*
  Usage:
    node update-burial-icon.js --check
    node update-burial-icon.js --apply
*/

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Prefer .env.local like test-db.js
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
} else {
  require('dotenv').config();
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL not found in environment variables.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const TARGET_COLUMNS = ['type_site', 'type_icon'];
const NEEDLE = 'burial.jpg';
const REPLACEMENT = 'burial.svg';

async function getExistingColumns(client) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = 'settlements'`
  );
  const set = new Set(rows.map(r => r.column_name));
  return TARGET_COLUMNS.filter(c => set.has(c));
}

async function countOccurrences(client, columnName) {
  const { rows } = await client.query(
    `SELECT 
       SUM(CASE WHEN lower(${columnName}) = $1 THEN 1 ELSE 0 END) AS exact_count,
       SUM(CASE WHEN ${columnName} ILIKE $2 THEN 1 ELSE 0 END) AS like_count
     FROM settlements`,
    [NEEDLE, `%${NEEDLE}%`]
  );
  const { exact_count, like_count } = rows[0] || { exact_count: 0, like_count: 0 };
  return { exact: Number(exact_count || 0), like: Number(like_count || 0) };
}

async function applyReplacement(client, columnName) {
  const result = await client.query(
    `UPDATE settlements
     SET ${columnName} = REPLACE(${columnName}, $1, $2)
     WHERE ${columnName} ILIKE $3`,
    [NEEDLE, REPLACEMENT, `%${NEEDLE}%`]
  );
  return result.rowCount || 0;
}

async function runCheck() {
  const client = await pool.connect();
  try {
    const columns = await getExistingColumns(client);
    console.log('Existing target columns on settlements:', columns);
    if (columns.length === 0) {
      console.log('No target columns found. Nothing to update.');
      return;
    }
    for (const col of columns) {
      const counts = await countOccurrences(client, col);
      console.log(`Column ${col}: exact='${counts.exact}', like='${counts.like}' for '${NEEDLE}'`);
    }
  } finally {
    client.release();
  }
}

async function runApply() {
  const client = await pool.connect();
  try {
    const columns = await getExistingColumns(client);
    if (columns.length === 0) {
      console.log('No target columns found. Nothing to update.');
      return;
    }
    await client.query('BEGIN');
    let totalUpdated = 0;
    for (const col of columns) {
      const updated = await applyReplacement(client, col);
      console.log(`Updated ${updated} row(s) in column ${col}.`);
      totalUpdated += updated;
    }
    await client.query('COMMIT');
    console.log(`Done. Total rows updated: ${totalUpdated}`);

    // Post-check
    console.log('Post-update check:');
    for (const col of columns) {
      const counts = await countOccurrences(client, col);
      console.log(`Column ${col} now: exact='${counts.exact}', like='${counts.like}' for '${NEEDLE}'`);
    }
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* noop */ }
    console.error('Error during update, rolled back:', e);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--check') {
    await runCheck();
  } else if (arg === '--apply') {
    await runApply();
  } else {
    console.log('Usage:');
    console.log('  node update-burial-icon.js --check');
    console.log('  node update-burial-icon.js --apply');
  }
  await pool.end();
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});



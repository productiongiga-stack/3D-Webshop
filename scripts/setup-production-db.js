#!/usr/bin/env node
/**
 * Test PostgreSQL, apply schema, seed catalog + owner.
 * Requires DATABASE_URL (and optional PG_AUTO_INIT_SCHEMA=true).
 *
 * Usage:
 *   DATABASE_URL='postgresql://...' node scripts/setup-production-db.js
 */
const { Client } = require('pg');

async function testConnection() {
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) {
    throw new Error('DATABASE_URL ontbreekt');
  }
  const client = new Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });
  await client.connect();
  const { rows } = await client.query('SELECT version()');
  console.log('Database OK:', rows[0].version.split(' ').slice(0, 2).join(' '));
  await client.end();
}

async function main() {
  process.env.PG_AUTO_INIT_SCHEMA = process.env.PG_AUTO_INIT_SCHEMA || 'true';
  process.env.FORCE_PRODUCTS = process.env.FORCE_PRODUCTS || '1';

  await testConnection();

  const { execSync } = require('child_process');
  const opts = { stdio: 'inherit', env: process.env };
  execSync('node scripts/seed-digitify-catalog.js', opts);
  execSync('node scripts/seed-owner.js', opts);

  console.log('Productie-database klaar (schema + catalogus + owner).');
}

main().catch((err) => {
  console.error('Setup mislukt:', err.message);
  process.exit(1);
});

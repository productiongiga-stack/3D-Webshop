#!/usr/bin/env node
/**
 * Mirror public assets from PostgreSQL upload_blobs + public/assets to Vercel Blob CDN.
 * Requires DATABASE_URL and BLOB_READ_WRITE_TOKEN (optional BLOB_PUBLIC_BASE_URL).
 *
 * Usage:
 *   node scripts/backfill-blob-cdn.js
 *   node scripts/backfill-blob-cdn.js --dry-run
 */
const fs = require('fs');
const path = require('path');
const { mirrorPublicAssetIfConfigured, getAssetCdnBase } = require('../lib/asset-storage');

async function listDbAssetPaths(db) {
  const rows = await db.prepare(`
    SELECT path, mime_type, data, size_bytes
    FROM upload_blobs
    WHERE path LIKE 'assets/%'
    ORDER BY path ASC
  `).all();
  return Array.isArray(rows) ? rows : [];
}

function listPublicAssetFiles(publicDir) {
  const root = path.join(publicDir, 'assets');
  if (!fs.existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) {
        const rel = path.relative(publicDir, abs).replace(/\\/g, '/');
        if (rel.startsWith('assets/')) out.push(rel);
      }
    }
  };
  walk(root);
  return out;
}

function mimeFromExt(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.woff2': 'font/woff2'
  };
  return map[String(ext || '').toLowerCase()] || 'application/octet-stream';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN ontbreekt');
  }
  const cdn = getAssetCdnBase();
  if (!cdn) {
    console.warn('Waarschuwing: BLOB_PUBLIC_BASE_URL / ASSET_CDN_BASE niet gezet — uploads gaan wel naar Blob maar URLs blijven same-origin.');
  } else {
    console.log('CDN base:', cdn);
  }

  const { db, initDatabase } = require('../db');
  await initDatabase();

  const publicDir = path.join(__dirname, '..', 'public');
  const dbRows = await listDbAssetPaths(db);
  const dbMap = new Map(dbRows.map((row) => [String(row.path || ''), row]));
  const staticPaths = listPublicAssetFiles(publicDir);
  const allPaths = new Set([...dbMap.keys(), ...staticPaths]);

  let mirrored = 0;
  let skipped = 0;
  let failed = 0;

  for (const rel of [...allPaths].sort()) {
    if (!rel || !rel.startsWith('assets/')) continue;
    let buffer = null;
    let mime = 'application/octet-stream';
    const row = dbMap.get(rel);
    if (row?.data) {
      buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
      mime = String(row.mime_type || mimeFromExt(path.extname(rel)));
    } else {
      const abs = path.join(publicDir, rel);
      if (!fs.existsSync(abs)) {
        skipped += 1;
        continue;
      }
      buffer = fs.readFileSync(abs);
      mime = mimeFromExt(path.extname(abs));
    }
    if (!buffer?.length) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      console.log('[dry-run]', rel, buffer.length, 'bytes');
      mirrored += 1;
      continue;
    }
    try {
      const url = await mirrorPublicAssetIfConfigured(rel, buffer, mime);
      if (url) {
        mirrored += 1;
        console.log('OK', rel);
      } else {
        failed += 1;
        console.warn('FAIL', rel);
      }
    } catch (err) {
      failed += 1;
      console.warn('ERR', rel, err?.message || err);
    }
  }

  console.log(`Klaar: ${mirrored} gemirrord, ${skipped} overgeslagen, ${failed} mislukt (${allPaths.size} paden).`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Backfill mislukt:', err.message || err);
  process.exit(1);
});

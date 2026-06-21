#!/usr/bin/env node
/**
 * Production smoke test: hero 3D loads and CSP allows Blob CDN GLB fetches.
 * Usage: SHOP_URL=https://shop.digitify.be node scripts/smoke-shop.mjs
 */
import { chromium } from 'playwright';

const SHOP_URL = String(process.env.SHOP_URL || 'https://shop.digitify.be').replace(/\/+$/, '');
const WAIT_MS = Number(process.env.SMOKE_WAIT_MS || 8000);

function fail(message) {
  console.error(`SMOKE FAIL: ${message}`);
  process.exit(1);
}

async function checkHealth() {
  const res = await fetch(`${SHOP_URL}/api/health`);
  if (!res.ok) fail(`/api/health returned ${res.status}`);
  const body = await res.json();
  if (!body.ok) fail(`/api/health ok=false status=${body.status}`);
  console.log(`health: ${body.status} sample3d=${body.checks?.sample3d} sample3dCdn=${body.checks?.sample3dCdn || 'n/a'}`);
}

async function checkHero3d() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  await page.goto(`${SHOP_URL}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(WAIT_MS);

  const state = await page.evaluate(() => ({
    heroMode: document.querySelector('.storefront-hero-stage')?.dataset?.mediaMode,
    posterHidden: document.getElementById('hero3dPoster')?.hidden,
    posterSrc: document.getElementById('hero3dPoster')?.getAttribute('src')
  }));

  await browser.close();

  if (state.heroMode !== '3d') {
    fail(`hero media mode is "${state.heroMode}" (expected "3d")`);
  }
  if (!state.posterHidden) {
    fail(`hero poster visible (src=${state.posterSrc || 'none'})`);
  }

  const blocked = logs.filter((line) =>
    /Content Security Policy|Refused to connect.*blob\.vercel-storage|Failed to fetch.*model\.glb/i.test(line)
  );
  if (blocked.length) {
    fail(`CSP/GLB errors in console:\n${blocked.join('\n')}`);
  }

  console.log(`hero: mode=${state.heroMode} posterHidden=${state.posterHidden}`);
}

await checkHealth();
await checkHero3d();
console.log('SMOKE OK');

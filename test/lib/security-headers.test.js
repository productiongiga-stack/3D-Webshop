const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('security-headers', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    delete process.env.ASSET_CDN_BASE;
    delete process.env.PUBLIC_ASSET_CDN;
    delete process.env.BLOB_PUBLIC_BASE_URL;
    delete require.cache[require.resolve('../../lib/security-headers')];
    delete require.cache[require.resolve('../../lib/asset-storage')];
  });

  afterEach(() => {
    process.env = { ...envBackup };
    delete require.cache[require.resolve('../../lib/security-headers')];
    delete require.cache[require.resolve('../../lib/asset-storage')];
  });

  it('includes Vercel Blob wildcard in connect-src', () => {
    const { buildConnectSrc } = require('../../lib/security-headers');
    const connectSrc = buildConnectSrc();
    assert.match(connectSrc, /https:\/\/\*\.public\.blob\.vercel-storage\.com/);
    assert.match(connectSrc, /https:\/\/esm\.sh/);
    assert.match(connectSrc, /'self'/);
  });

  it('adds explicit CDN base when BLOB_PUBLIC_BASE_URL is set', () => {
    process.env.BLOB_PUBLIC_BASE_URL = 'https://example.public.blob.vercel-storage.com';
    delete require.cache[require.resolve('../../lib/security-headers')];
    delete require.cache[require.resolve('../../lib/asset-storage')];
    const { buildConnectSrc, securityHeadersMiddleware } = require('../../lib/security-headers');
    const connectSrc = buildConnectSrc();
    assert.match(connectSrc, /https:\/\/example\.public\.blob\.vercel-storage\.com/);

    let cspHeader = '';
    const res = { setHeader(name, value) { if (name === 'Content-Security-Policy') cspHeader = value; } };
    securityHeadersMiddleware({ secure: false, headers: {} }, res, () => {});
    assert.match(cspHeader, /connect-src [^;]*https:\/\/example\.public\.blob\.vercel-storage\.com/);
  });
});

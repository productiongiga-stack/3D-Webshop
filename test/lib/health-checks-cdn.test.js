const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('checkSample3dCdnAsset', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    delete process.env.BLOB_PUBLIC_BASE_URL;
    delete process.env.ASSET_CDN_BASE;
    delete require.cache[require.resolve('../../lib/health-checks')];
    delete require.cache[require.resolve('../../lib/asset-storage')];
  });

  afterEach(() => {
    process.env = { ...envBackup };
    delete require.cache[require.resolve('../../lib/health-checks')];
    delete require.cache[require.resolve('../../lib/asset-storage')];
  });

  it('skips when CDN is not configured', async () => {
    const { checkSample3dCdnAsset } = require('../../lib/health-checks');
    const result = await checkSample3dCdnAsset([{
      id: 'led-lichtbak-kabel',
      model3d: { enabled: true, modelPath: 'assets/products/digitify/led-lichtbak-kabel/model.glb' }
    }]);
    assert.equal(result.status, 'skip');
  });
});

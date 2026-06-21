const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeProducts, mergeStoredProductWithDefaults, DEFAULT_CONFIG } = require('../../db');

describe('sanitizeProducts model3d', () => {
  it('preserves poster and scale', () => {
    const out = sanitizeProducts([{
      id: 'demo',
      name: 'Demo',
      enabled: true,
      model3d: {
        enabled: true,
        modelPath: 'assets/products/3d/demo/model.glb',
        posterPath: 'assets/products/3d/demo/poster.webp',
        scale: 2.5,
        rotationY: -45
      }
    }]);
    assert.equal(out[0].model3d.posterPath, 'assets/products/3d/demo/poster.webp');
    assert.equal(out[0].model3d.scale, 2.5);
    assert.equal(out[0].model3d.rotationY, -45);
  });

  it('disables 3D when model path missing', () => {
    const out = sanitizeProducts([{
      id: 'demo',
      name: 'Demo',
      enabled: true,
      model3d: { enabled: true, modelPath: '', posterPath: 'x.webp' }
    }]);
    assert.equal(out[0].model3d.enabled, false);
  });

  it('preserves designer visibility and mockup path', () => {
    const out = sanitizeProducts([{
      id: 'nfc-band',
      name: 'NFC band',
      enabled: true,
      mockupPath: 'assets/products/digitify/nfc-polsbandjes/mock.png',
      designerEnabled: false,
      designerMockupPath: 'assets/products/digitify/nfc-polsbandjes/designer.png'
    }]);
    assert.equal(out[0].designerEnabled, false);
    assert.equal(out[0].designerMockupPath, 'assets/products/digitify/nfc-polsbandjes/designer.png');
  });

  it('inherits designerEnabled from catalog defaults when omitted', () => {
    const out = sanitizeProducts([{
      id: 'nfc-sleutelhangers',
      name: 'NFC sleutelhangers',
      enabled: true,
      mockupPath: 'assets/products/digitify/nfc-sleutelhangers/mock.png'
    }]);
    assert.equal(out[0].designerEnabled, true);
  });

  it('keeps explicit designerEnabled false', () => {
    const out = sanitizeProducts([{
      id: 'nfc-polsbandjes',
      name: 'NFC polsbandjes',
      enabled: true,
      mockupPath: 'assets/products/digitify/nfc-polsbandjes/mock.png',
      designerEnabled: false
    }]);
    assert.equal(out[0].designerEnabled, false);
  });

  it('keeps explicit designerEnabled true even when default catalog disables designer', () => {
    const out = sanitizeProducts([{
      id: 'led-lichtbak-oplaadbaar',
      name: 'LED lichtbak A4 (oplaadbaar)',
      enabled: true,
      mockupPath: 'assets/products/digitify/led-lichtbak-oplaadbaar/mock.png',
      designerEnabled: true
    }]);
    assert.equal(out[0].designerEnabled, true);
    assert.equal(out[0].designerMockupPath, undefined);
  });

  it('clears designerMockupPath when explicitly emptied', () => {
    const out = sanitizeProducts([{
      id: 'nfc-band',
      name: 'NFC band',
      enabled: true,
      mockupPath: 'assets/products/digitify/nfc-polsbandjes/mock.png',
      designerEnabled: true,
      designerMockupPath: ''
    }]);
    assert.equal(out[0].designerEnabled, true);
    assert.equal(out[0].designerMockupPath, '');
  });

  it('does not auto-enable designer for custom mockup products', () => {
    const out = sanitizeProducts([{
      id: 'custom-tag',
      name: 'Custom tag',
      enabled: true,
      mockupPath: 'assets/products/mockup-123.png'
    }]);
    assert.equal(out[0].designerEnabled, undefined);
  });

  it('restores catalog sizes and colors when stored product data was wiped', () => {
    const merged = mergeStoredProductWithDefaults({
      id: 'led-lichtbak-kabel',
      name: 'LED lichtbak A3/A4 (kabel)',
      enabled: true,
      mockupPath: 'assets/products/digitify/led-lichtbak-kabel/mock.png',
      basePrice: 49.95,
      sizes: [],
      colorHexes: []
    });
    const out = sanitizeProducts([merged]);
    assert.equal(out[0].sizes[0].code, 'A4');
    assert.equal(out[0].sizes[0].widthMm, 297);
    assert.deepEqual(out[0].colorHexes, ['#ffffff']);
  });

  it('restores catalog sizes when generic STD 100x100 placeholder was saved', () => {
    const merged = mergeStoredProductWithDefaults({
      id: 'nfc-polsbandjes',
      name: 'NFC polsbandjes',
      enabled: true,
      sizes: [{ code: 'STD', widthMm: 100, heightMm: 100 }],
      colorHexes: ['#0b0b0b']
    });
    const out = sanitizeProducts([merged]);
    assert.equal(out[0].sizes[0].code, 'STD');
    assert.equal(out[0].sizes[0].widthMm, 250);
    assert.deepEqual(out[0].colorHexes, ['#ffffff', '#0b0b0b', '#ffaf51']);
  });
});

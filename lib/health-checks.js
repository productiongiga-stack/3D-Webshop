const fs = require('fs');
const path = require('path');
const { getStorageMode, getAssetCdnBase } = require('./asset-storage');

async function checkStorageReachable(readStoredUpload, uploadDir) {
  const mode = getStorageMode();
  const cdn = getAssetCdnBase();
  let diskOk = false;
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
    diskOk = true;
  } catch {
    diskOk = false;
  }
  let blobSampleOk = null;
  const sampleRel = 'assets/tshirt_mockup.png';
  const sampleAbs = path.join(uploadDir, sampleRel);
  if (fs.existsSync(sampleAbs)) {
    blobSampleOk = true;
  } else if (readStoredUpload) {
    const row = await readStoredUpload(sampleRel);
    blobSampleOk = !!row?.buffer?.length;
  }
  return {
    mode,
    cdnConfigured: !!cdn,
    diskWritable: diskOk,
    sampleReadable: blobSampleOk === true ? 'ok' : (blobSampleOk === false ? 'missing' : 'unknown')
  };
}

async function checkSample3dAsset(products, readStoredUpload) {
  const list = Array.isArray(products) ? products : [];
  const candidate = list.find((p) => {
    const m3d = p?.model3d || {};
    return m3d.enabled !== false && String(m3d.modelPath || '').trim();
  });
  if (!candidate) return { status: 'skip', detail: 'Geen 3D-producten' };
  const rel = String(candidate.model3d.modelPath || '').replace(/^\/+/, '');
  if (!rel) return { status: 'skip', detail: 'Geen modelpad' };
  const publicPath = path.join(__dirname, '..', 'public', rel);
  if (fs.existsSync(publicPath)) {
    const stat = fs.statSync(publicPath);
    return {
      status: 'ok',
      detail: `Model OK (${candidate.id})`,
      productId: candidate.id,
      path: rel,
      sizeBytes: stat.size,
      source: 'public'
    };
  }
  const file = readStoredUpload ? await readStoredUpload(rel) : null;
  if (!file?.buffer?.length) {
    return { status: 'error', detail: `Model niet bereikbaar (${candidate.id})`, productId: candidate.id, path: rel };
  }
  return {
    status: 'ok',
    detail: `Model OK (${candidate.id})`,
    productId: candidate.id,
    path: rel,
    sizeBytes: file.sizeBytes || file.buffer.length,
    source: 'storage'
  };
}

function checkStripeConfigured(getStripeClient) {
  if (typeof getStripeClient !== 'function') {
    return { status: process.env.STRIPE_SECRET_KEY ? 'ok' : 'warn', detail: process.env.STRIPE_SECRET_KEY ? 'env key' : 'niet geconfigureerd' };
  }
  return getStripeClient().then((client) => ({
    status: client ? 'ok' : 'warn',
    detail: client ? 'client ready' : 'niet geconfigureerd'
  })).catch(() => ({ status: 'warn', detail: 'check mislukt' }));
}

function checkSmtpConfigured(cfg) {
  const smtp = cfg?.smtp || {};
  const ok = !!(smtp.host && (smtp.user || smtp.passSet));
  return { status: ok ? 'ok' : 'warn', detail: ok ? smtp.host : 'host/user ontbreekt' };
}

async function checkSample3dCdnAsset(products) {
  const cdn = getAssetCdnBase();
  if (!cdn) return { status: 'skip', detail: 'Geen asset CDN geconfigureerd' };

  const list = Array.isArray(products) ? products : [];
  const candidate = list.find((p) => {
    const m3d = p?.model3d || {};
    return m3d.enabled !== false && String(m3d.modelPath || '').trim();
  });
  if (!candidate) return { status: 'skip', detail: 'Geen 3D-producten' };

  const rel = String(candidate.model3d.modelPath || '').replace(/^\/+/, '');
  if (!rel) return { status: 'skip', detail: 'Geen modelpad' };

  const url = `${cdn}/${rel}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (!res.ok) {
      return {
        status: 'warn',
        detail: `CDN HEAD ${res.status} (${candidate.id})`,
        productId: candidate.id,
        path: rel,
        url
      };
    }
    const sizeHeader = res.headers.get('content-length');
    return {
      status: 'ok',
      detail: `CDN model OK (${candidate.id})`,
      productId: candidate.id,
      path: rel,
      url,
      sizeBytes: sizeHeader ? Number(sizeHeader) : null
    };
  } catch (err) {
    return {
      status: 'warn',
      detail: err?.message || 'CDN HEAD mislukt',
      productId: candidate.id,
      path: rel,
      url
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  checkStorageReachable,
  checkSample3dAsset,
  checkSample3dCdnAsset,
  checkStripeConfigured,
  checkSmtpConfigured
};

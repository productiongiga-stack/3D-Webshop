/** Lightweight security headers (no helmet dependency). */
const { getAssetCdnBase } = require('./asset-storage');

function buildConnectSrc() {
  const sources = [
    "'self'",
    'blob:',
    'data:',
    'https://esm.sh',
    'https://www.gstatic.com',
    // Vercel Blob public asset stores (3D GLB/OBJ fetch via GLTFLoader)
    'https://*.public.blob.vercel-storage.com'
  ];
  const cdn = getAssetCdnBase();
  if (cdn) sources.push(cdn);
  return sources.join(' ');
}

function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://esm.sh https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${buildConnectSrc()}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
}

module.exports = { securityHeadersMiddleware };

/**
 * Vercel serverless entry point.
 * Boots the Express app (DB init, session setup, owner seed) once on cold start,
 * then delegates every request to Express.
 */
const { app, boot } = require('../server');

let booted = false;
let bootPromise = null;

module.exports = async (req, res) => {
  try {
    if (!booted) {
      bootPromise = bootPromise || boot();
      try {
        await bootPromise;
      } catch (err) {
        bootPromise = null;
        throw err;
      }
      booted = true;
    }
    return app(req, res);
  } catch (err) {
    console.error('[api] boot/handler failed:', err);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        error: err?.message || 'Server startup failed',
        hint: process.env.VERCEL && !process.env.DATABASE_URL
          ? 'Set DATABASE_URL in Vercel environment variables.'
          : undefined
      }));
    }
  }
};

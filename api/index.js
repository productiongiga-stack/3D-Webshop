/**
 * Vercel serverless entry point.
 * Boots the Express app (DB init, session setup, owner seed) once on cold start,
 * then delegates every request to Express.
 */
const { app, boot } = require('../server');

let booted = false;
let bootPromise = null;

module.exports = async (req, res) => {
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
};

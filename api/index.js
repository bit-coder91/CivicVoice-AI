/**
 * CivicVoice AI — Vercel Serverless Master Entrypoint
 * Handles all /api/* requests with shared in-memory state and zero external dependencies.
 */

const { handleApiRequest } = require('./_lib/router');

module.exports = async (req, res) => {
  await handleApiRequest(req, res);
};

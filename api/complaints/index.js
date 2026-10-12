const { handleApiRequest } = require('../_lib/router');

module.exports = async (req, res) => {
  // If invoked directly as /api/complaints
  if (!req.url.startsWith('/api/complaints')) {
    req.url = '/api/complaints' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  await handleApiRequest(req, res);
};

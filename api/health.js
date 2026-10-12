const { handleApiRequest } = require('./_lib/router');

module.exports = async (req, res) => {
  req.url = '/api/health';
  await handleApiRequest(req, res);
};

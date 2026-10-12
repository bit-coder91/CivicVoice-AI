const { handleApiRequest } = require('../_lib/router');

module.exports = async (req, res) => {
  req.url = '/api/dashboard/stats';
  await handleApiRequest(req, res);
};

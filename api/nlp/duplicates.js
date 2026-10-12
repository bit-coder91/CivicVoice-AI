const { handleApiRequest } = require('../_lib/router');

module.exports = async (req, res) => {
  req.url = '/api/nlp/duplicates';
  await handleApiRequest(req, res);
};

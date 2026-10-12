const { handleApiRequest } = require('../_lib/router');

module.exports = async (req, res) => {
  const id = req.query?.id;
  if (id) {
    req.url = `/api/complaints/${id}/status`;
  }
  await handleApiRequest(req, res);
};

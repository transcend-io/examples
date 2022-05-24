const path = require('path');

const { TRANSCEND_API_KEY, SOMBRA_API_KEY, SOMBRA_URL, PORT, AUDIENCE } =
  process.env;

module.exports = {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  AUDIENCE,
  SOMBRA_URL: SOMBRA_URL || 'https://multi-tenant.sombra.transcend.io',
  PORT: PORT || 8081,
  MEDIA_FOLDER: path.join(__dirname, '..', '..', 'media'),
};

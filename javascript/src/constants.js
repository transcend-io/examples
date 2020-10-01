const {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL,
  PORT,
} = process.env;

module.exports = {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL: SOMBRA_URL || 'https://multi-tenant.sombra.transcend.io',
  PORT: PORT || 8081,
};

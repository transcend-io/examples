const {
  TRANSCEND_API_KEY,
  ENRICHMENT_SIGNING_KEY,
  PORT,
} = process.env;

module.exports = {
  TRANSCEND_API_KEY,
  ENRICHMENT_SIGNING_KEY,
  PORT: PORT || 8081,
}

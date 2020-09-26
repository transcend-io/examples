// Libraries
const jwt = require('jsonwebtoken');

// Constants
const {
  ENRICHMENT_SIGNING_KEY,
} = require('../constants');

// In this example, the signing key is stored as a base64-encoded env var
const DECODED_ENRICHMENT_SIGNING_KEY = Buffer.from(ENRICHMENT_SIGNING_KEY, 'base64').toString();

/**
 * Sign an identifier with a JWT
 * @param {Object} content
 */
module.exports = function createEnricherJwt(content) {
  return jwt.sign(
    // The content to sign
    content,
    // The private key for the enricher (you should have uploaded the public key)
    DECODED_ENRICHMENT_SIGNING_KEY, {
      algorithm: 'ES384',
      expiresIn: '1d',
      // organization URI from https://app.transcend.io/settings#OrganizationSettings
      audience: 'e-shop-it',
    }
  )
};

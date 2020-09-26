// Libraries
const got = require('got');
const jwt = require('jsonwebtoken');

// Constants
const {
  TRANSCEND_API_KEY,
} = require('../constants');

// Global to cache the webhook signing public key
let cachedPublicKey;

/**
 * Helper to verify incoming webhook requests
 *
 * Transcend developers: A design choice was made not to put webhook verification on an Express middleware. It's a nice refactor, but it can be esoteric to readers.
 *
 * @param {string} signedToken - the JSON Web Token asymetrically signed with ES384.
 * @returns {Object} - the signed body
 */
module.exports = async function verifyAndExtractWebhook(signedToken) {
  // Get the public key and cache it for next time.
  if (!cachedPublicKey) {
    try {
      const response = await got.get(
        'https://multi-tenant.sombra.transcend.io/public-keys/sombra-general-signing-key', {
          headers: {
            authorization: `Bearer ${TRANSCEND_API_KEY}`,
          },
        },
      );
      cachedPublicKey = response.body;
    } catch (err) {
      console.error('Failed to get public key:', err);
    }
  }

  // Verify webhook signature with the public key (ensures that Transcend sent the request)
  const signedBody = jwt.verify(signedToken, cachedPublicKey, {
    algorithms: ['ES384'],
  });

  return signedBody;
}
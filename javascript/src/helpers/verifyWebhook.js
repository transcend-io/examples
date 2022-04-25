// Libraries
const got = require('got');
const jwt = require('jsonwebtoken');

// Constants
const {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL,
} = require('../constants');
const { logger } = require('../logger');

// Global to cache the webhook signing public key
let cachedPublicKey;

/**
 * Helper to verify incoming webhook requests
 *
 * Transcend developers: A design choice was made not to put webhook verification on an Express middleware.
 * It's a nice refactor, but it can be esoteric to readers.
 *
 * @param signedToken - the JSON Web Token asymmetrically signed with ES384.
 * @returns - the signed body
 */
module.exports = async function verifyWebhook(signedToken) {
  // Get the public key and cache it for next time.
  if (!cachedPublicKey) {
    try {
      const response = await got.get(
        `${SOMBRA_URL}/public-keys/sombra-general-signing-key`,
        {
          headers: {
            authorization: `Bearer ${TRANSCEND_API_KEY}`,
            'x-sombra-authorization': SOMBRA_API_KEY
              ? `Bearer ${SOMBRA_API_KEY}`
              : undefined,
          },
        },
      );
      cachedPublicKey = response.body;
    } catch (err) {
      logger.error('Failed to get public key:', err);
    }
  }

  // Verify webhook signature with the public key (ensures that Transcend sent the request)
  return jwt.verify(signedToken, cachedPublicKey, {
    algorithms: ['ES384'],
  });
};

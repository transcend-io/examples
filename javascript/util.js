// Libraries
const got = require('got');
const jwt = require('jsonwebtoken');

// Constants
const {
  TRANSCEND_API_KEY,
  ENRICHMENT_SIGNING_KEY,
} = require('./constants');

// In this example, the signing key is stored as a base64-encoded env var
const DECODED_ENRICHMENT_SIGNING_KEY = Buffer.from(ENRICHMENT_SIGNING_KEY, 'base64').toString();

// Global to cache the webhook signing public key
let cachedPublicKey;

/**
 * Check user against fraud systems
 * Is this user suspected of fraud?
 *
 * Since this is a demo, it just checks for name+fraud@example.com
 */
module.exports.checkIfFraudster = async (email) => {
  const flag = email.split('@')[0].split('+')[1];
  return ['thefraudster', 'fraud', 'fraudster'].includes(flag);
}

/**
 * Check user against legal hold
 * Is there a reason why we can't fulfill this request right now?
 *
 * Since this is a demo, it just checks for name+legalhold@example.com
 */
module.exports.checkForLegalHold = async (email) => {
  const flag = email.split('@')[0].split('+')[1];
  return ['legalhold'].includes(flag);
}

/**
 * Helper to verify incoming webhook requests
 *
 * Transcend developers: A design choice was made not to put webhook verification on an Express middleware. It's a nice refactor, but it can be esoteric to readers.
 *
 * @param {string} signedToken - the JSON Web Token asymetrically signed with ES384.
 * @returns {Object} - the signed body
 */
module.exports.verifyAndExtractWebhook = async (signedToken) => {
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

/**
 * Sign an identifier with a JWT
 * @param {Object} content
 */
module.exports.createEnricherJwt = (content) => jwt.sign(
  // The content to sign
  content,
  // The private key for the enricher (you should have uploaded the public key)
  DECODED_ENRICHMENT_SIGNING_KEY, {
    algorithm: 'ES384',
    expiresIn: '1d',
    // organization URI from https://app.transcend.io/settings#OrganizationSettings
    audience: 'e-shop-it',
  }
);

/**
 * Look inside a database and return the person's user profiles
 */
module.exports.lookUpUser = async (userIdentifier) => {
  return [{
    profileId: userIdentifier,
    profileData: {
      name: 'Ben Farrell',
      interests: 'Privacy Tech',
    },
  }];
}

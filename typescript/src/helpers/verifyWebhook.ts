// Libraries
import got from 'got';
import jwt from 'jsonwebtoken';

// Constants
import { TRANSCEND_API_KEY, SOMBRA_API_KEY, SOMBRA_URL } from '../constants';

import { logger } from '../logger';

// Global to cache the webhook signing public key
let cachedPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret;

/**
 * Helper to verify incoming webhook requests
 *
 * Transcend developers: A design choice was made not to put webhook verification on an Express middleware.
 * It's a nice refactor, but it can be esoteric to readers.
 *
 * @param signedToken - the JSON Web Token asymmetrically signed with ES384.
 * @returns - the signed body
 */
export async function verifyWebhook(
  signedToken: string | string[] | undefined,
): Promise<void> {
  // Get the public key and cache it for next time.
  if (!cachedPublicKey) {
    try {
      const publicKeyUrl = `${SOMBRA_URL}/public-keys/sombra-general-signing-key`;
      logger.info(`Fetching transcend public key: ${publicKeyUrl}`);
      const response = await got.get(publicKeyUrl, {
        headers: {
          authorization: `Bearer ${TRANSCEND_API_KEY}`,
          'x-sombra-authorization': SOMBRA_API_KEY
            ? `Bearer ${SOMBRA_API_KEY}`
            : undefined,
        },
      });
      cachedPublicKey = response.body;
    } catch (err) {
      logger.error('Failed to get public key:', err);
    }
  }
  // Verify webhook signature with the public key (ensures that Transcend sent the request)
  return jwt.verify(
    Array.isArray(signedToken) ? signedToken.join() : signedToken || '',
    cachedPublicKey,
    {
      algorithms: ['ES384'],
    },
  );
}

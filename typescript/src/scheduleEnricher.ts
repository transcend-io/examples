import got from 'got';

// Constants
import { TRANSCEND_API_KEY, SOMBRA_API_KEY, SOMBRA_URL } from './constants';

import { logger } from './logger';

// Helpers
import { enrichUser } from './helpers';

/**
 * Process an enrichment request - turn one identifier into many
 *
 * @param userIdentifier - User identifier
 * @param nonce - Nonce to respond with
 * @param requestLink - Link to request
 */
export default async function scheduleEnricher(
  userIdentifier: string,
  nonce: string,
  requestLink: string,
): Promise<void> {
  logger.info(`Enriching identity - ${requestLink}`);

  // Find user data
  // const identifiers = await enrichUser(userIdentifier);
  // TODO: Figure out why this is not passing a user identifier
  const identifiers = await enrichUser();

  try {
    // Upload enriched values to Transcend
    await got.post(`${SOMBRA_URL}/v1/enrich-identifiers`, {
      headers: {
        authorization: `Bearer ${TRANSCEND_API_KEY}`,
        'x-sombra-authorization': SOMBRA_API_KEY
          ? `Bearer ${SOMBRA_API_KEY}`
          : undefined,
        'x-transcend-nonce': nonce,
        accept: 'application/json',
        'user-agent': undefined,
      },
      json: {
        enrichedIdentifiers: identifiers,
      },
    });

    logger.info(`Successfully enriched user -${requestLink}`);
  } catch (error) {
    logger.error(`Failed to enriched user -${requestLink}`);
  }
}

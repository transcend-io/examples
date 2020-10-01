const got = require('got');

// Constants
const { TRANSCEND_API_KEY, SOMBRA_API_KEY, SOMBRA_URL } = require('./constants');

// Helpers
const { enricherUser } = require('./helpers');

/**
 * Process an enrichment request
 */
module.exports = async function scheduleEnricher(userIdentifier, nonce, requestLink) {
  console.info(`Enriching identity - https://app.transcend.io${requestLink}`);

  // Find user data
  const identifiers = await enricherUser(userIdentifier);
  try {
    // Respond with enriched values
    await got.post(`${SOMBRA_URL}/v1/enrich-identifiers`, {
        headers: {
        authorization: `Bearer ${TRANSCEND_API_KEY}`,
        'x-sombra-authorization': SOMBRA_API_KEY ? `Bearer ${SOMBRA_API_KEY}` : undefined,
        'x-transcend-nonce': nonce,
        accept: 'application/json',
        'user-agent': undefined,
        },
        json: {
        enrichedIdentifiers: identifiers,
        },
    });
    console.info(`Successfully enriched user - https://app.transcend.io${requestLink}`);
  } catch (error) {
    console.error(`Failed to enriched user - https://app.transcend.io${requestLink}`);
  }
};

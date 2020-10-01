const asyncHandler = require('express-async-handler');

// Helpers
const {
  checkIfFraudster,
  checkForLegalHold,
  verifyAndExtractWebhook,
} = require('./helpers');
const scheduleEnricher = require('./scheduleEnricher')

/**
 * Enrichment webhook handler.
 * Checks for fraud/legal holds and returns extra identifiers.
 */
module.exports = asyncHandler(async function handleEnrichmentWebhook(req, res) {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  let signedBody;
  try {
    signedBody = await verifyAndExtractWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  console.info(
    `Received Enrichment webhook - https://app.transcend.io${req.body.extras.request.link}`,
  );

  // Check if we should place a hold on this request
  const requestIdentifier = signedBody.value;
  const isFraudster = await checkIfFraudster(requestIdentifier);
  const hasLegalHold = await checkForLegalHold(requestIdentifier);
  const nonce = req.headers['x-transcend-nonce'];

  // In this case, we are automatically cancelling requests from fraudsters.
  if (isFraudster) {
    res.json({
      status: 'CANCELED',
    });
    console.info(
      `Successfully responded to Enrichment webhook with CANCELED signal - https://app.transcend.io${req.body.extras.request.link}`,
    );
    return null;
  }

  // In this case, we are putting a hold on the request so legal can review it.
  if (hasLegalHold) {
    res.json({
      status: 'ON_HOLD',
      signedRequestIdentifiers,
    });
    console.info(
      `Successfully responded to Enrichment webhook with ON_HOLD signal - https://app.transcend.io${req.body.extras.request.link}`,
    );
    return null;
  }
  

  // Schedule the enrichment job
  scheduleEnricher(requestIdentifier, nonce, req.body.extras.request.link);

  // Indicate we got the webhook
  res.status(200).send();

  console.info(
    `Successfully responded to Enrichment webhook - https://app.transcend.io${req.body.extras.request.link}`,
  );

  return null;
});

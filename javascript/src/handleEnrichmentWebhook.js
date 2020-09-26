const asyncHandler = require('express-async-handler');

// Helpers
const {
  createEnricherJwt,
  checkIfFraudster,
  checkForLegalHold,
  verifyAndExtractWebhook,
} = require('./helpers');

/////////////////////
// WEBHOOK HANDLER //
/////////////////////

module.exports = asyncHandler(async (req, res, next) => {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  let signedBody;
  try {
    signedBody = await verifyAndExtractWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  // Add new identifers
  const signedRequestIdentifiers = {
    email: [
      createEnricherJwt({
        value: 'test+enriched@transcend.io',
      }),
      createEnricherJwt({
        value: 'test+access@transcend.io',
      }),
    ],
    phone: [
      createEnricherJwt({
        countryCode: 'US',
        number: '+18609066012',
      }),
    ],
  };

  // Check if we should place a hold on this request
  const requestIdentifier = signedBody.value;
  const isFraudster = await checkIfFraudster(requestIdentifier);
  const hasLegalHold = await checkForLegalHold(requestIdentifier);

  // In this case, we are automatically cancelling requests from fraudsters.
  if (isFraudster)
    return res.json({
      status: 'CANCELED',
    });

  // In this case, we are putting a hold on the request so legal can review it.
  if (hasLegalHold)
    return res.json({
      status: 'ON_HOLD',
      signedRequestIdentifiers,
    });

  // Allow the request to proceed
  return res.json({
    signedRequestIdentifiers,
  });
});

const asyncHandler = require('express-async-handler');

// Helpers
const {
  verifyAndExtractWebhook,
} = require('./helpers');

const scheduleAccessRequest = require('./scheduleAccessRequest');

/////////////////////
// WEBHOOK HANDLER //
/////////////////////

module.exports = asyncHandler(async (req, res, next) => {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  try {
    await verifyAndExtractWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.sendStatus(401).send('You are not Transcend!');
  }

  console.info(`Received DSR webhook - https://app.transcend.io${req.body.extras.request.link}`);

  // Extract metadata from the webhook
  const userIdentifier = req.body.coreIdentifier.value;
  const webhookType = req.body.type; // ACCESS, ERASURE, etc: https://docs.transcend.io/docs/receiving-webhooks#events
  const nonce = req.headers['x-transcend-nonce'];

  // Depending on the type of webhook, respond accordingly.
  switch (webhookType) {
    case 'ACCESS':
      // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
      scheduleAccessRequest(userIdentifier, nonce, req.body.extras.request.link);

      // Respond OK - webhook received properly.
      res.sendStatus(200);
      break;

    case 'ERASURE':
      // Respond with an early "no user found" signal.
      res.sendStatus(204);
      break;

    default:
      console.warn(`This type of DSR webhook is unimplemented - https://app.transcend.io${req.body.extras.request.link}`);
      return res.status(400).send('This type of privacy request is unimplemented.');
  }

  console.info(`Successfully responded to DSR webhook - https://app.transcend.io${req.body.extras.request.link}`);
});

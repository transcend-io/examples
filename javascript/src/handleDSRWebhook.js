const asyncHandler = require('express-async-handler');

// Helpers
const { verifyAndExtractWebhook } = require('./helpers');

const scheduleAccessRequest = require('./scheduleAccessRequest');

/**
 * DSR webhook handler
 * Receives the DSR notification and schedules an async job.
 */
module.exports = asyncHandler(async function handleDSRWebhook(req, res) {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  try {
    await verifyAndExtractWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  console.info(`Received DSR webhook - https://app.transcend.io${req.body.extras.request.link}`);

  // Extract metadata from the webhook
  const userIdentifier = req.body.profile.identifier; // req.body.profile.type will tell you if this is an email vs username, vs other identifier
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
      // TODO: show an erasure PUT request in this example https://docs.transcend.io/docs/responding-to-dsrs#fulfill-an-erasure-request-dser
      res.sendStatus(204);
      break;

    default:
      console.warn(
        `This type of DSR webhook is unimplemented - https://app.transcend.io${req.body.extras.request.link}`,
      );
      return res.status(400).send('This type of privacy request is unimplemented.');
  }

  console.info(
    `Successfully responded to DSR webhook - https://app.transcend.io${req.body.extras.request.link}`,
  );

  return null;
});

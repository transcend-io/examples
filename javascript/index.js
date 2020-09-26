/*
 * Developer note: this server is live at https://transcend-example.onrender.com for the eShopIt demo
 * https://e-shop-it.trsnd.co
 */

// Libraries
const express = require('express');
const bodyParser = require('body-parser');

// Load environment variables
require('dotenv').config();

// Utils
const {
  verifyAndExtractWebhook,
  checkIfFraudster,
  checkForLegalHold,
  scheduleAccessRequest,
  scheduleErasureRequest,
  createEnricherJwt,
} = require('./util');

// Set up the server
const app = express();
const port = 8081;

// Middlewares
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(bodyParser.json());

app.all('/health', (_, res) => res.sendStatus(200));

//////////////////////
// WEBHOOK HANDLERS //
//////////////////////

/*
 * Receive webhook for identity enrichment (optional)
 * This path is set by you in the Admin Dashboard.
 */
app.post('/transcend/enrichment', async (req, res, next) => {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  let signedBody;
  try {
    signedBody = await verifyAndExtractWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  const requestIdentifier = signedBody.value;

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
        number: '+18609066012'
      }),
    ],
  };

  // Check if we should place a hold on this request
  const isFraudster = await checkIfFraudster(requestIdentifier);
  const hasLegalHold = await checkForLegalHold(requestIdentifier);

  // In this case, we are automatically cancelling requests from fraudsters.
  if (isFraudster) return res.json({
    status: 'CANCELED',
  });

  // In this case, we are putting a hold on the request so legal can review it.
  if (hasLegalHold) return res.json({
    status: 'ON_HOLD',
    signedRequestIdentifiers,
  });

  // Allow the request to proceed
  return res.json({
    signedRequestIdentifiers,
  });
});

/*
 * Receive webhook (Transcend's notification to this server)
 * This path is set by you in the Admin Dashboard.
 */
app.post('/transcend/new-dsr', async (req, res, next) => {
  // console.log({
  //   body: req.body,
  //   headers: req.headers,
  // });

  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  try {
    await verifyAndExtractWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  // Extract metadata from the webhook
  const userIdentifier = req.body.coreIdentifier; // we know this
  const dataSubjectType = req.body.dataSubject.type; // ACCESS, ERASURE, etc: https://docs.transcend.io/docs/receiving-webhooks#events
  const webhookType = req.type;

  // Depending on the type of webhook, respond accordingly.
  switch (webhookType) {
    case 'ACCESS':
      // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
      scheduleAccessRequest(userIdentifier, dataSubjectType);

      // Respond OK - webhook received properly.
      res.sendStatus(200);

    case 'ERASURE':
      // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
      scheduleErasureRequest(userIdentifier, dataSubjectType);

      // Respond OK - webhook received properly.
      res.sendStatus(200);

    default:
      res.status(400).send('This type of privacy request is unimplemented.');
  }
});

app.listen(port, () => console.log(`Example custom data silo listening on port ${port}!`));

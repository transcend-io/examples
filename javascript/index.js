/*
 * Developer note: this server is live at https://transcend-example.onrender.com for the eShopIt demo
 * https://e-shop-it.trsnd.co
 */

// Libraries
const express = require('express');
const asyncHandler = require('express-async-handler');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const got = require('got');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const {
  promisify
} = require('util');

const pipeline = promisify(stream.pipeline);

// Load environment variables
require('dotenv').config();

// Utils
const {
  verifyAndExtractWebhook,
  checkIfFraudster,
  checkForLegalHold,
  createEnricherJwt,
  lookUpUser,
} = require('./util');

// Constants
const {
  TRANSCEND_API_KEY
} = process.env;

// Set up the server
const app = express();
const port = 8081;

// Middlewares
app.use(morgan('tiny'));

app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(bodyParser.json());

app.all('/health', (_, res) => res.sendStatus(200));

//////////////////////
// POST TO TRANSCND //
//////////////////////

/**
 * Process an access request for this user
 */
async function scheduleAccessRequest(userIdentifier, dataSubjectType, nonce) {
  // Find user data
  const userData = await lookUpUser(userIdentifier, dataSubjectType);

  // Upload in bulk to datapoints, with a JSON payload
  const bulkUpload = got.post('https://multi-tenant.sombra.transcend.io/v1/data-silo', {
    headers: {
      authorization: `Bearer ${TRANSCEND_API_KEY}`,
      'x-transcend-nonce': nonce,
      accept: 'application/json',
      'user-agent': undefined,
    },
    json: {
      profiles: userData,
    },
  });

  // Upload a file to a datapoint
  const readFile = fs.createReadStream(path.join(__dirname, '/big_buck_bunny.mp4'));
  const fileUpload = got.stream.post('https://multi-tenant.sombra.transcend.io/v1/datapoint', {
    headers: {
      authorization: `Bearer ${TRANSCEND_API_KEY}`,
      'x-transcend-nonce': nonce,
      accept: 'application/json',
      'user-agent': undefined,
      'x-transcend-datapoint-name': 'Movies',
      'x-transcend-profile-id': 'ben.farrell',
    }
  });

  const fileUploadPipeline = await pipeline(
    readFile,
    fileUpload,
  );

  try {
    await Promise.all([bulkUpload, fileUploadPipeline]);
  } catch (error) {
    console.error('Failed to upload to Transcend.', error.response.body);
  }
}

/**
 * Process an access request for this user
 */
async function scheduleErasureRequest(userIdentifier, dataSubjectType, nonce) {}

//////////////////////
// WEBHOOK HANDLERS //
//////////////////////

/*
 * Receive webhook for identity enrichment (optional)
 * This path is set by you in the Admin Dashboard.
 */
app.post(
  '/transcend/enrichment',
  asyncHandler(async (req, res, next) => {
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
          number: '+18609066012',
        }),
      ],
    };

    // Check if we should place a hold on this request
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
  }),
);

/*
 * Receive webhook (Transcend's notification to this server)
 * This path is set by you in the Admin Dashboard.
 */
app.post(
  '/transcend/new-dsr',
  asyncHandler(async (req, res, next) => {
    // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
    try {
      await verifyAndExtractWebhook(req.headers['x-sombra-token']);
    } catch (error) {
      // If the webhook doesn't pass verification, reject it.
      return res.sendStatus(401).send('You are not Transcend!');
    }

    // Extract metadata from the webhook
    const userIdentifier = req.body.coreIdentifier; // we know this
    const dataSubjectType = req.body.dataSubject.type; // ACCESS, ERASURE, etc: https://docs.transcend.io/docs/receiving-webhooks#events
    const webhookType = req.body.type;
    const nonce = req.headers['x-transcend-nonce'];

    // Depending on the type of webhook, respond accordingly.
    switch (webhookType) {
      case 'ACCESS':
        // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
        scheduleAccessRequest(userIdentifier, dataSubjectType, nonce);

        // Respond OK - webhook received properly.
        res.sendStatus(200);
        break;

      case 'ERASURE':
        // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
        scheduleErasureRequest(userIdentifier, dataSubjectType, nonce);

        // Respond OK - webhook received properly.
        res.sendStatus(200);
        break;

      default:
        res.status(400).send('This type of privacy request is unimplemented.');
    }
  }),
);

app.listen(port, () => console.log(`Example custom data silo listening on port ${port}.`));

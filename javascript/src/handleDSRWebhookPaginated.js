const got = require('got');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('express-async-handler');

// Helpers
const { verifyWebhook } = require('./helpers');

// Constants
const {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL,
  MEDIA_FOLDER,
} = require('./constants');
const { logger } = require('./logger');

// User data
const FRIENDS = JSON.parse(
  fs.readFileSync(path.join(MEDIA_FOLDER, 'friends.json'), 'utf8'),
);

// Mock database
// this is used for the purposes of demoing
const MockDatabaseModel = {
  findAll: ({ limit, offset }) => FRIENDS.slice(offset, offset + limit),
};

/**
 * Process an access request for this user and upload the result to Transcend
 *
 * @param userIdentifier - User identifier
 * @param nonce - Nonce to respond with
 * @param requestLink - Link to request
 */
async function scheduleAccessChunkedRequest(
  userIdentifier,
  nonce,
  requestLink,
) {
  logger.info(`Uploading data - ${requestLink}`);
  try {
    let hasMore = true;
    let offset = 0;
    const PAGE_SIZE = 300; // set this as high as you can without overwhelming your database

    let i = 0;
    while (hasMore) {
      const data = await MockDatabaseModel.findAll({
        where: { userId: userIdentifier },
        order: [['createdAt', 'DESC']],
        limit: PAGE_SIZE,
        offset,
      });
      hasMore = data.length === PAGE_SIZE;
      await got.post({
        url: `${SOMBRA_URL}/v1/datapoint-chunked`,
        headers: {
          authorization: `Bearer ${TRANSCEND_API_KEY}`,
          'x-sombra-authorization': SOMBRA_API_KEY
            ? `Bearer ${SOMBRA_API_KEY}`
            : undefined,
          'x-transcend-nonce': nonce,
          'content-type': 'application/json',
        },
        json: {
          fileId: `Page ${i} -- ${offset} - ${offset + data.length}`,
          dataPointName: 'friends',
          data,
          isLastPage: !hasMore,
        },
      });
      offset += PAGE_SIZE;
      i += 1;
      logger.info(`Sent page ${i}`);
    }
    logger.info(`Successfully uploaded data - ${requestLink}`);
  } catch (error) {
    logger.error(`Failed to upload data - ${requestLink} - ${error.message}`);
  }
}

/**
 * DSR webhook handler for large amounts of data that need to be paginated.
 *
 * @see https://docs.transcend.io/docs/api-reference/POST/v1/datapoint-chunked
 * @see https://docs.transcend.io/docs/api-reference/webhook/new-privacy-request-job
 */
module.exports = asyncHandler(async (req, res) => {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  try {
    await verifyWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  logger.info(`Received DSR webhook - ${req.body.extras.request.link}`);

  // Extract metadata from the body
  // req.body.extras.profile.type will tell you if this is an email vs username, vs other identifier
  const userIdentifier = req.body.extras.profile.identifier;
  const webhookType = req.body.type; // ACCESS, ERASURE, etc: https://docs.transcend.io/docs/receiving-webhooks#events
  const nonce = req.headers['x-transcend-nonce'];

  // Depending on the type of webhook, respond accordingly.
  switch (webhookType) {
    case 'ACCESS':
      // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
      scheduleAccessChunkedRequest(
        userIdentifier,
        nonce,
        req.body.extras.request.link,
      );

      // Respond OK - webhook received properly.
      res.sendStatus(200);
      break;

    case 'ERASURE':
      res.sendStatus(204);
      break;
    default:
      logger.warn(
        `This type of DSR webhook is unimplemented - ${req.body.extras.request.link}`,
      );
      return res
        .status(400)
        .send('This type of privacy request is unimplemented.');
  }

  logger.info(
    `Successfully responded to DSR webhook - ${req.body.extras.request.link}`,
  );

  return null;
});

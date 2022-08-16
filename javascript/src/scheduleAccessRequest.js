const got = require('got');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

// Constants
const {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL,
  MEDIA_FOLDER,
} = require('./constants');
const { logger } = require('./logger');
// Helpers
const { lookUpUser } = require('./helpers');

/**
 * Process an access request for this user and upload the result to Transcend
 *
 * @param userIdentifier - User identifier
 * @param nonce - Nonce to respond with
 * @param requestLink - Link to request
 */
module.exports = async function scheduleAccessRequest(
  userIdentifier,
  nonce,
  requestLink,
) {
  logger.info(`Uploading data - ${requestLink}`);

  // Find user data
  const userData = await lookUpUser(userIdentifier);

  logger.info('NORMAL ACCESS REQUEST');
  // Upload in bulk to datapoints, with a JSON payload
  const bulkUpload = got.post(`${SOMBRA_URL}/v1/data-silo`, {
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
      profiles: userData,
    },
  });

  // Upload a file to a datapoint
  const readFile = fs.createReadStream(
    path.join(MEDIA_FOLDER, 'big_buck_bunny.mp4'),
  );
  const fileUpload = got.stream.post(`${SOMBRA_URL}/v1/datapoint`, {
    headers: {
      authorization: `Bearer ${TRANSCEND_API_KEY}`,
      'x-sombra-authorization': SOMBRA_API_KEY
        ? `Bearer ${SOMBRA_API_KEY}`
        : undefined,
      'x-transcend-nonce': nonce,
      accept: 'application/json',
      'user-agent': undefined,
      'x-transcend-datapoint-name': 'Movies',
      'x-transcend-profile-id': userIdentifier,
    },
  });

  const fileUploadPipeline = await pipeline(readFile, fileUpload);

  logger.info('AFTER NORMAL ACCESS REQUEST');
  try {
    await Promise.all([bulkUpload, fileUploadPipeline]);
    logger.info(`Successfully uploaded data - ${requestLink}`);
  } catch (error) {
    logger.error(`Failed to upload data - ${requestLink}`);
  }
};

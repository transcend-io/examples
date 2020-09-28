const got = require('got');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const {
  promisify
} = require('util');

const pipeline = promisify(stream.pipeline);

// Constants
const {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL,
} = require('./constants');

// Helpers
const {
  lookUpUser,
} = require('./helpers');

//////////////////////
// POST TO TRANSCND //
//////////////////////

/**
 * Process an access request for this user
 */
module.exports = async function scheduleAccessRequest(userIdentifier, nonce, requestLink) {
  console.info(`Uploading data - https://app.transcend.io${requestLink}`);

  // Find user data
  const userData = await lookUpUser(userIdentifier);

  // Upload in bulk to datapoints, with a JSON payload
  const bulkUpload = got.post(`${SOMBRA_URL}/v1/data-silo`, {
    headers: {
      authorization: `Bearer ${TRANSCEND_API_KEY}`,
      'x-sombra-authorization': SOMBRA_API_KEY ? `Bearer ${SOMBRA_API_KEY}` : '',
      'x-transcend-nonce': nonce,
      accept: 'application/json',
      'user-agent': undefined,
    },
    json: {
      profiles: userData,
    },
  });

  // Upload a file to a datapoint
  const readFile = fs.createReadStream(path.join(__dirname, 'media/big_buck_bunny.mp4'));
  const fileUpload = got.stream.post(`${SOMBRA_URL}/v1/datapoint`, {
    headers: {
      authorization: `Bearer ${TRANSCEND_API_KEY}`,
      'x-sombra-authorization': SOMBRA_API_KEY ? `Bearer ${SOMBRA_API_KEY}` : '',
      'x-transcend-nonce': nonce,
      accept: 'application/json',
      'user-agent': undefined,
      'x-transcend-datapoint-name': 'Movies',
      'x-transcend-profile-id': userIdentifier,
    }
  });

  const fileUploadPipeline = await pipeline(
    readFile,
    fileUpload,
  );

  try {
    await Promise.all([bulkUpload, fileUploadPipeline]);
    console.info(`Successfully uploaded data - https://app.transcend.io${requestLink}`);
  } catch (error) {
    console.error(`Failed to upload data - https://app.transcend.io${requestLink}`);
  }
}

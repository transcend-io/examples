const got = require('got');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const {
  promisify
} = require('util');

const pipeline = promisify(stream.pipeline);

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
module.exports = async function scheduleAccessRequest(userIdentifier, nonce) {
  // Find user data
  const userData = await lookUpUser(userIdentifier);

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
      'x-transcend-profile-id': userIdentifier,
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

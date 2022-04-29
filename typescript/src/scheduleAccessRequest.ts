import got from 'got';

import path from 'path';

import { promisify } from 'util';

// Constants
import {
  TRANSCEND_API_KEY,
  SOMBRA_API_KEY,
  SOMBRA_URL,
  MEDIA_FOLDER,
} from './constants';

import { logger } from './logger';
// Helpers
import { lookUpUser } from './helpers';

const fs = require('fs');

const stream = require('stream');

const pipeline = promisify(stream.pipeline);

/**
 * Process an access request for this user and upload the result to Transcend
 *
 * @param userIdentifier - User identifier
 * @param nonce - Nonce to respond with
 * @param requestLink - Link to request
 */
export default async function scheduleAccessRequest(
  userIdentifier: string,
  nonce: string,
  requestLink: string,
): Promise<void> {
  logger.info(`Uploading data - ${requestLink}`);

  // Find user data
  const userData = await lookUpUser(userIdentifier);

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

  try {
    await Promise.all([bulkUpload, fileUploadPipeline]);
    logger.info(`Successfully uploaded data - ${requestLink}`);
  } catch (error) {
    logger.error(`Failed to upload data - ${requestLink}`);
  }
}

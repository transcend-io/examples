import { Request, Response } from 'express';
// Helpers
import { verifyWebhook } from './helpers';

import { logger } from './logger';

import scheduleAccessRequest from './scheduleAccessRequest';

/**
 * DSR webhook handler
 * Receives the DSR notification and schedules an async job.
 *
 * @param req - request object
 * @param res - response object
 * @see https://docs.transcend.io/docs/api-reference/webhook/new-privacy-request-job
 */
export default async function handleDSRWebhook(
  req: Request,
  res: Response,
): Promise<Response<number, Record<string, number>> | null> {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  try {
    await verifyWebhook(req.headers['x-sombra-token']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error(`Error occurred validating webhook: ${error?.stack}`);
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  logger.info(`Received DSR webhook - ${req.body.extras.request.link}`);

  // Extract metadata from the body
  // req.body.extras.profile.type will tell you if this is an email vs username, vs other identifier
  const userIdentifier = req.body.extras.profile.identifier;
  const webhookType = req.body.type; // ACCESS, ERASURE, etc: https://docs.transcend.io/docs/receiving-webhooks#events
  let nonce: string | string[] | undefined = req.headers['x-transcend-nonce'];
  nonce = Array.isArray(nonce) ? nonce.join() : nonce || '';

  // Depending on the type of webhook, respond accordingly.
  switch (webhookType) {
    case 'ACCESS':
      // Schedule the job to run. Results of the job are sent to Transcend separately (in a different HTTP request, in case the job is slow).
      scheduleAccessRequest(
        userIdentifier,
        nonce,
        req.body.extras.request.link,
      );

      // Respond OK - webhook received properly.
      res.sendStatus(200);
      break;

    case 'ERASURE':
      // Respond with an early "no user found" signal.
      // TODO: show an erasure PUT request in this example https://docs.transcend.io/docs/responding-to-dsrs#fulfill-an-erasure-request-dser
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
}

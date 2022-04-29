import { Request, Response } from 'express';

// Helpers
import { checkIfFraudster, checkForLegalHold, verifyWebhook } from './helpers';

import { logger } from './logger';

import scheduleEnricher from './scheduleEnricher';

/**
 * Enrichment webhook handler.
 * Checks for fraud/legal holds and returns extra identifiers.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export default async function handleEnrichmentWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  // Verify the incoming webhook is coming from Transcend, and via the Sombra gateway.
  try {
    await verifyWebhook(req.headers['x-sombra-token']);
  } catch (error) {
    // If the webhook doesn't pass verification, reject it.
    return res.status(401).send('You are not Transcend!');
  }

  logger.info(`Received Enrichment webhook - ${req.body.extras.request.link}`);

  // Extract metadata from the body
  const requestIdentifier = req.body.requestIdentifier.value;

  // Check if we should place a hold on this request
  const isFraudster = await checkIfFraudster(requestIdentifier);
  const hasLegalHold = await checkForLegalHold(requestIdentifier);

  // In this case, we are automatically cancelling requests from fraudsters.
  if (isFraudster) {
    res.json({
      status: 'CANCELED',
      templateId: 'ee54169a-9a87-4e93-aa2d-be733cce9113',
    });
    logger.info(
      `Successfully responded to Enrichment webhook with CANCELED signal - ${req.body.extras.request.link}`,
    );
    return null;
  }

  // In this case, we are putting a hold on the request so legal can review it.
  if (hasLegalHold) {
    res.json({
      status: 'ON_HOLD',
    });
    logger.info(
      `Successfully responded to Enrichment webhook with ON_HOLD signal - ${req.body.extras.request.link}`,
    );
    return null;
  }

  // Schedule the enrichment job
  let nonce: string | string[] | undefined = req.headers['x-transcend-nonce'];
  nonce = Array.isArray(nonce) ? nonce.join() : nonce || '';
  scheduleEnricher(requestIdentifier, nonce, req.body.extras.request.link);

  // Indicate we got the webhook
  res.status(200).send();

  logger.info(
    `Successfully responded to Enrichment webhook - ${req.body.extras.request.link}`,
  );

  return null;
}

import { Request, Response } from 'express';

/**
 * Returns a health check message
 *
 * @param req - request object
 * @param res - response object
 * @returns null
 */
export default function handleDSRWebhook(req: Request, res: Response): null {
  res.send('hello!');
  return null;
}

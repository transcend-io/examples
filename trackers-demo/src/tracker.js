// Libraries
const express = require('express');
const cors = require('cors');
const { readFileSync } = require('fs');
const { join } = require('path');
const cookie = require('cookie');

// Constants
const { TRACKER_PORT, MEDIA_FOLDER } = require('./constants');
const { logger } = require('./logger');

// Set up the server
const app = express();

/**
 * For the purposes of demo generate a unique value for the duration
 * of the server running. Every time the app restarts this will be updated
 */
const uniqueRunId = Math.random().toString();

/**
 * Allow for this server to serve up assets to any web page.
 * This prevents cors errors during cross-site rendering.
 */
app.use(cors());

/**
 * Expose a simple endpoint that renders an image!
 *
 * But under the hood, this route additionally is a tracker.
 * It collects and logs out the IP address and browser headers provided
 * in each request, as well as sets cookies that it reads from on
 * subsequent requests.
 */
app.get('/image-tracker.jpeg', (req, res, next) => {
  try {
    // IP address and request headers can always be viewed and logged
    logger.info(`New incoming request received from IP address: "${req.ip}"`);
    logger.info(
      `The following headers are viewable by the server: ${JSON.stringify(
        req.headers,
        null,
        2,
      )}`,
    );

    // Parse in previously set cookies and log them out
    const parsedCookies = req.headers.cookie
      ? cookie.parse(req.headers.cookie)
      : {};
    logger.info(
      `The following cookies can be read: "${JSON.stringify(
        parsedCookies,
        null,
        2,
      )}"`,
    );

    // Update the cookie for the unique run
    logger.info(`Setting the cookie: uniqueRunId=${uniqueRunId}`);
    res.cookie('uniqueRunId', uniqueRunId, { maxAge: 900000 });
    res.cookie('uniqueRunIdHttpOnly', uniqueRunId, {
      maxAge: 900000,
      httpOnly: true,
    });

    // Update a view count for user to track the number of times
    // they visited this page
    const viewCount = parsedCookies.viewCount
      ? parseInt(parsedCookies.viewCount, 10)
      : 0;
    logger.info(`Setting: viewCount=${viewCount + 1}`);
    res.cookie('viewCount', viewCount + 1, { maxAge: 900000 });
    res.cookie('viewCountHttpOnly', viewCount + 1, {
      maxAge: 900000,
      httpOnly: true,
    });

    // Create a unique session id for the requesting user.
    // Only create a new session ID if one is not provided
    // This is an HTTP only cookie and thus cannot be detected in client side
    // javascript code. It can only be seen in the browser settings or by this server
    if (!parsedCookies.sessionId) {
      const sessionId = Math.random().toString();
      logger.info(
        `Setting a unique HTTP-only session to identify this user: sessionId=${sessionId}`,
      );
      res.cookie('sessionIdHttpOnly', sessionId, {
        maxAge: 900000,
        httpOnly: true,
      });
    }

    // Resolve the image like nothing else above happened
    logger.info('Resolving the image after cookies have been set');
    res.status(200).send(readFileSync(join(MEDIA_FOLDER, 'tortoise.jpeg')));
  } catch (err) {
    next(err);
  }
});

app.listen(TRACKER_PORT, () =>
  logger.info(
    `Tracker server listening on port ${TRACKER_PORT}. Started with uniqueRunId: ${uniqueRunId}`,
  ),
);

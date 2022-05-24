/**
 * Developer note: this server is live at https://transcend-example.onrender.com.
 * This server is used on the E-Shop-It Transcend instance https://e-shop-it.trsnd.co.
 * Some endpoints are also used for other Transcend testing applications
 */

// Libraries
const express = require('express');

// Constants
const { PORT, TRACKER_PORT } = require('./constants');
const { logger } = require('./logger');

// Set up the server
const app = express();

app.get('/image-tracker-index.html', (req, res, next) => {
  try {
    res.status(200).send(
      `<html lang="en">
        <img src="http://localhost:${TRACKER_PORT}/image-tracker.jpeg" />
        </html>`,
    );
  } catch (err) {
    next(err);
  }
});

app.get('/image-tracker-anonymous.html', (req, res, next) => {
  try {
    res.status(200).send(
      `<html lang="en">
        <img src="http://localhost:${TRACKER_PORT}/image-tracker.jpeg" crossorigin="anonymous" />
        </html>`,
    );
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () =>
  logger.info(`
 Demo server listening on port ${PORT}.

Go to:
- http://localhost:${PORT}/image-tracker-index.html
- http://localhost:${PORT}/image-tracker-anonymous.html
`),
);

/**
 * Developer note: this server is live at https://transcend-example.onrender.com.
 * This server is used on the E-Shop-It Transcend instance https://e-shop-it.trsnd.co.
 * Some endpoints are also used for other Transcend testing applications
 */

// Load environment variables
require('dotenv').config();

// Libraries
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Load webhook handling middlewares
const handleEnrichmentWebhook = require('./handleEnrichmentWebhook');
const handleDSRWebhook = require('./handleDSRWebhook');
const handleDSRWebhookPaginated = require('./handleDSRWebhookPaginated');

// Constants
const { PORT } = require('./constants');
const { logger } = require('./logger');

// Set up the server
const app = express();
const port = PORT;
app.all('/health', (_, res) => res.sendStatus(200));

// Middlewares
app.use(morgan('tiny'));

app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(bodyParser.json());

/**
 * Receive webhook for identity enrichment (optional)
 * This path is set by you in the Admin Dashboard.
 */
app.post('/transcend/enrichment', handleEnrichmentWebhook);

/**
 * Receive webhook (Transcend's notification to this server)
 * This path is set by you in the Admin Dashboard.
 */
app.post('/transcend/new-dsr', handleDSRWebhook);

/**
 * This route is an alternative to `/transcend/new-dsr` for situations
 * where you have a lot of data of a certain type that you may need to
 * page over and upload in chunks.
 */
app.post('/transcend/new-dsr-paginated', handleDSRWebhookPaginated);

app.listen(port, () =>
  logger.info(`Example custom data silo listening on port ${port}.`),
);

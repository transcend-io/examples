/*
 * Developer note: this server is live at https://transcend-example.onrender.com for the eShopIt demo
 * https://e-shop-it.trsnd.co
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

// Constants
const {
  PORT
} = require('./constants');

// Set up the server
const app = express();
const port = PORT;

// Middlewares
app.use(morgan('tiny'));

app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(bodyParser.json());

app.all('/health', (_, res) => res.sendStatus(200));

/*
 * Receive webhook for identity enrichment (optional)
 * This path is set by you in the Admin Dashboard.
 */
app.post(
  '/transcend/enrichment',
  handleEnrichmentWebhook,
);

/*
 * Receive webhook (Transcend's notification to this server)
 * This path is set by you in the Admin Dashboard.
 */
app.post(
  '/transcend/new-dsr',
  handleDSRWebhook,
);

app.listen(port, () => console.info(`Example custom data silo listening on port ${port}.`));

/* https://transcend-example.onrender.com/new-dsr */

// Libraries
const express = require('express');
const bodyParser = require('body-parser');
const got = require('got');
const jwt = require('jsonwebtoken');

// Utils
const {
  checkIfSuspicious,
  checkForLegalHolds
} = require('./util');

// Load environment variables
require('dotenv').config();
const {
  TRANSCEND_API_KEY
} = process.env;

// Set up the server
const app = express();
const port = 8080;

// Middlewares
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(bodyParser.json());

app.all('/health', (_, res) => res.sendStatus(200));

// Global to cache the Transcend public key.
let cachedPublicKey;

// Receive webhook (Transcend's notification to this server)
app.post('/new-dsr', async function (req, res, next) {
  console.log({
    body: req.body,
    headers: req.headers
  });
  try {
    // Get the public key and cache it for next time.
    if (!cachedPublicKey) {
      const {
        body
      } = await got.get(
        'https://multi-tenant.sombra.transcend.io/public-keys/sombra-general-signing-key', {
          headers: {
            authorization: `Bearer ${TRANSCEND_API_KEY}`,
          },
        },
      );
      cachedPublicKey = body;
    }

    // Verify webhook signature (ensures that Transcend sent the request)
    const isVerified = jwt.verify(req.headers['x-sombra-token'], cachedPublicKey, {
      algorithms: ['ES384'],
    });

    if (!isVerified) {
      // Reject the request
      return res.status(401).send('You are not Transcend!');
    }

    // Respond 200 immediately
    res.sendStatus(200);

    /* ---- Everything below here can happen async (e.g. a job is scheduled above, and the result is returned below) ---- */

    // Look up personal data
    const userProfiles = await lookUpUser(req.body.identifiers);

    // Send data to Transcend (via HTTP POST with JSON body)
    got.post('https://multi-tenant.sombra.transcend.io/v1/upload', {
      headers: {
        Authorization: `Bearer ${TRANSCEND_API_KEY}`,
        'x-transcend-nonce': req.headers['x-transcend-nonce'],
        // 'x-sombra-authorization': `Bearer ${SOMBRA}`, // TODO: TURN OFF INTERNAL_KEY ON MULTI
      },
      json: {
        profiles: userProfiles,
      },
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

// Look inside a database and return the person's user profiles
async function lookUpUser() {
  return [{
    profileId: 'ben.farrell',
    profileData: {
      name: 'Ben Farrell',
      score: 3.8,
      interests: 'Privacy Tech',
    },
  }, ];
}

app.listen(port, () => console.log(`Example custom data silo listening on port ${port}!`));

// Libraries
const express = require('express');
const bodyParser = require('body-parser');
const got = require('got');
const jwt = require('jwt');

// Set up the server
const app = express();
const port = 4445;

// Middlewares
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);

app.use(bodyParser.json());

// Hard-coded API key - this is a secret that should be in the env variables or somewhere secure
const MY_API_KEY = 'xOFLvITmIFCA3InzYDUGX4tPw5bYvu0g6eEHK';

// Receive webhook (Transcend's notification to this server)
app.post('/new-dsr', async function (req, res) {
  // Verify webhook signature (ensures that Transcend sent the request and someone else)
  const isVerified = jwt.verify(req.headers.signature, 'HS256', MY_API_KEY);

  if (isVerified) {
    // Respond 200 immediately
    res.send('Thanks Transcend. I will send data soon!');

    // Look up personal data
    const userProfiles = await lookUpUser(req.body.identifiers);

    // Send data to Transcend (via HTTP POST with JSON body)
    got.post('https://api.transcend.io/v0/upload', {
      headers: {
        Authorization: `Bearer ${MY_API_KEY}`,
      },
      json: {
        request_id: req.body.request_id, // Retrieved from the webhook, this should be looked up in data storage
        profiles: userProfiles,
      },
    });
  } else {
    // Reject the request
    return res.status(401).send('You are not Transcend!');
  }
});

// Look inside a database and return the person's user profiles
async function lookUpUser() {
  return [
    {
      profile_id: 'ben.farrell',
      profile_data: {
        name: 'Ben Farrell',
        score: 3.8,
        interests: 'Privacy Tech',
      },
    },
  ];
}

app.listen(port, () => console.log(`Example custom data silo listening on port ${port}!`));

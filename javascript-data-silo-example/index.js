/**
 * Example of connecting a custom data silo to Transcend via HTTP API
 * https://docs.transcend.io/docs/silo-server
 * 
 * Install:
 * npm install
 * 
 * Start Server:
 * node index
 * 
 * In another terminal tab, open tunnel to the web:
 * npm install -g ngrok
 * ngrok http 8080
 */

// Libraries
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const jws = require('jws')

// Set up the server
const app = express()
const port = 8080
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Hardcoded API key - this is a secret that should be in the env variables or somewhere secure
const mydatasiloapikey = 'xOFLvITmIFCA3InzYDUGX4tPw5bYvu0g6eEHK'


// Receive webhook (Transcend's notification to this server)
app.all('/new-dsr', function (req, res) {
    // Verify webhook signature (ensures that Transcend sent the request and someone else)
    const isVerified = jws.verify(req.headers.signature, 'HS256', mydatasiloapikey)

    if (isVerified) {
        // Respond 200 immediately
        res.send('Thanks Transcend. I will send data soon!')
        
        // Look up personal data
        const userProfiles = lookUpUser(req.body.identifiers)
    
        // Send data to Transcend (via HTTP POST with JSON body)
        request.post('https://api.transcend.io/v0/upload', {
            headers: {
                Authorization: mydatasiloapikey,
            },
            body: {
                request_id: req.body.request_id, // Retrieved from the webhook, this should be looked up in data storage
                profiles: userProfiles
            },
            json: true
        })
    } else {
        // Reject the request
        return res.status(401).send('You are not Transcend!')
    }
})


// Look inside a database and return the person's user profiles
function lookUpUser(userProfiles) {
    return [{
        profile_id: 'ben.farrell',
        profile_data: {
          name: 'Ben Farrell',
          score: 3.8,
          interests: 'Privacy Tech',
        }
      }]
}


app.listen(port, () => console.log(`Example custom data silo listening on port ${port}!`)) 

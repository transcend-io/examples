#!/usr/bin/env bash
set -e

###############################################################################
# Send a mocked post request to a server silo
#
# Usage:
# ./mock_post.sh
###############################################################################

curl --request POST https://localhost:4443 \
  -H 'accept: application/json' \
  -H 'content-type: application/json' \
  -H 'HOST: 5c7mrnpfye.execute-api.eu-west-1.amazonaws.com' \
  -H 'Via: HTTPS/1.1 patreon.sombra.transcend.io:5041 (Sombra)' \
  -H 'X-Amzn-Trace-Id: Root=1-5cf82cf5-6d5907894b61145f98f6e8bd' \
  -H 'X-Forwarded-For: 99.81.203.242' \
  -H 'X-Forwarded-Port: 443' \
  -H 'X-Forwarded-Proto: https' \
  -H 'x-origin: SM_EX' \
  -H 'x-sombra-token: eyJhbGciOiJFUzM4NCIsInR5cCI6IkpXVCJ9.eyJ2YWx1ZSI6IjE5NTMwNjIxIiwiaWF0IjoxNTU5NzY4MzA5LCJhdWQiOiJwYXRyZW9uIn0.EVXuUWQWceGI2zBEbQGIaP_LgwCwtABPYTl-GB1C2M3zDyZG-I3whsc5-GP_iUEx8mw9iMhthiuiVS-yAGQt49LXL6NOD49lM7itL2z9cRzld3VLEyTffENOusULrBwx' \
  -H 'x-transcend-nonce: eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJlbmNyeXB0ZWRDRUtDb250ZXh0IjoiZXlKaGJHY2lPaUpJVXpNNE5DSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmxibU55ZVhCMFpXUkRSVXNpT2lKMFFsWmxVSE4xY1Zsb1dsZGtkamx5TDNKbFFscFlTMUZ3YzFOMkszYzRURXBRU2tZeldtSlpNa3hDWmpCd1ozRnBXa3hxVjNjOVBTSXNJbkpsY1hWbGMzUkpaQ0k2SWpneFpqUXhOREE0TFdVME56Z3ROREZsTkMxaU1ESTVMV1EyWWpCbVkyRmtNelprTVNJc0ltTnZjbVZKWkdWdWRHbG1hV1Z5SWpvaU1UazFNekEyTWpFaUxDSnBZWFFpT2pFMU5UazNOamd5T0RCOS41dHh4ZWtETWtUUUlhT29Oc3BiTHlBcTZnY2NHZkhwdUNaM3hLaTltTEF4azhoZFQ0d2xZT0RvVjVfZEp3bmtQIiwicmVxdWVzdElkIjoiNGEyYWY4YzQtM2I3Mi00ZjAxLTk4MjItYjg3M2QxNDM4NDFkIiwiZGF0YVNpbG9JZCI6IiIsImlhdCI6MTU1OTc2ODMwOX0.froe0_m-fJ8Kv0p-QCkrjIFcSEBpYNloJo1UBTkf0JlBQqAgXBGg_mLJDvet1ZWf' \
  --data "{\"type\":\"PREFLIGHT\",\"extraIdentifiers\":{\"email\":[{\"id\":\"bd133b20-2898-4480-b72f-8c31d66ada39\",\"value\":\"mkfrl09+1@gmail.com\"}],\"custom\":[],\"googleProfileId\":[]},\"dataSubject\":{\"type\":\"customer\"},\"isTest\":false,\"extras\":{\"request\":{\"details\":\"\",\"id\":\"4a2af8c4-3b72-4f01-9822-b873d143841d\",\"link\":\"https://app.transcend.io/request/4a2af8c4-3b72-4f01-9822-b873d143841d\",\"verifiedAt\":\"2019-06-05T20:58:29.094Z\",\"createdAt\":\"2019-06-05T20:58:00.355Z\",\"locale\":\"en\",\"origin\":\"PRIVACY_CENTER\"},\"organization\":{\"id\":\"aaca371a-1ca0-4c55-9631-a1d8088a0e7d\",\"name\":\"Patreon\",\"uri\":\"patreon\"}},\"coreIdentifier\":{\"value\":\"19530621\"}}"

# Server
from http.server import HTTPServer, BaseHTTPRequestHandler
import ssl

# core
import io
import os
import json
import requests
from werkzeug.exceptions import Unauthorized
from threading import Thread

# JWTs
import jwt
from jwt.exceptions import DecodeError, InvalidKeyError, InvalidAudienceError

#################
# Configuration #
#################

# The API to post to Transcend THIS IS A SECRET, STORE SAFELY AND CYCLE REGULARLY
TRANSCEND_API_KEY = os.environ.get('TRANSCEND_API_KEY', '4ff241e61c60288babed50097aab17eb38d97face63ac06923da85345f8ce559')

# The API to use with the sombra instance that encrypts the data before hitting Transcends servers THIS IS A SECRET, STORE SAFELY AND CYCLE REGULARLY
SOMBRA_API_KEY = os.environ.get('SOMBRA_API_KEY')

# The url of the sombra instance
SOMBRA_URL = os.environ.get('SOMBRA_URL', 'https://multi-tenant.sombra.transcend.io')

# The url to respond to webhooks with
TRANSCEND_WEBHOOK_URL = SOMBRA_URL + '/v1/data-silo'

# Whether to verify the JWT from Transcend, set to False to trust the JWT always
VERIFY_JWT = True

# The audience on the JWT to verify. You can find your Organization URI at https://app.transcend.io/infrastructure/sombra, which is the audience
AUDIENCE = os.environ.get('AUDIENCE')

# Whether to trust self signed certs
TRUST_SELF_SIGNED_CERT = False

USE_HTTPS = os.environ.get('USE_HTTPS', 'True') == 'True'

# Some test data
MOCK_DATA = {
    '19530621': {
        'gpa': 3.89,
        'name': 'Freddie Mercury',
        'id': '19530621'
    },
    'david+test@transcend.io': {
        'gpa': 1.3,
        'name': 'Mr. Privacy',
        'id': '19530622'
    },
    'python@test.com': {
        'gpa': 1.3,
        'name': 'DSR Test',
        'id': '19530623'
    }
}

IS_A_FRAUD = {
    '19530621': False
}

###########
# Helpers #
###########

"""
Get the sombra public key, used to verify the request
"""
def get_transcend_public_key():
    res = requests.get(
        SOMBRA_URL + '/public-keys/sombra-general-signing-key',
        verify = not TRUST_SELF_SIGNED_CERT,
        headers = { "authorization": "Bearer {}".format(TRANSCEND_API_KEY) }
    )
    return res.content

"""
Validate the sombra token and get the verified core identifer
"""
def verify_transcend_webhook(headers):
    token = headers.get('x-sombra-token')  # Contains a signed user_id

    # Decode the jwt
    try:
        decoded = jwt.decode(
            bytes(token, 'utf-8'),
            get_transcend_public_key(),
            algorithms=['ES384'],
            audience=AUDIENCE,
            verify=VERIFY_JWT,  # Only validate in prod where the tokens are real
        )
        if decoded.get('scope') != 'coreIdentifier':
            print('Saw unexpected scope "{}" in JWT'.format(decoded.get('scope')))
            raise ValueError()

        return decoded.get('value')
    except (DecodeError, InvalidKeyError, InvalidAudienceError, ValueError):
        raise Unauthorized()


"""
Construct the headers to respond to webhooks with
"""
def response_headers(response_jwt_token):
    return {
        "authorization": "Bearer {}".format(TRANSCEND_API_KEY),
        "x-sombra-authorization": "Bearer {}".format(SOMBRA_API_KEY) if SOMBRA_API_KEY else None,
        "x-transcend-nonce": response_jwt_token,
        "accept": "application/json",
        "content-type": "application/json",
    }

"""
Perform an access request
"""
def perform_access(user, headers):
    formatted_data = user
    outgoing_request_body = {
        "profiles": [{
            "profileId": user['id'],
            "profileData": formatted_data,
        }],
    }
    requests.post(
        SOMBRA_URL + '/v1/data-silo',
        json=outgoing_request_body,
        headers=headers,
        verify=not TRUST_SELF_SIGNED_CERT
    )

"""
Perform an erasure request
"""
def perform_erasure(user, headers):
    # TODO perform erasure

    # Notify success
    outgoing_request_body = {
        "profiles": [{
            "profileId": user['id'],
        }],
    }

    requests.put(
        TRANSCEND_WEBHOOK_URL,
        json=outgoing_request_body,
        headers=headers,
        verify=not TRUST_SELF_SIGNED_CERT
    )

"""
Handler for processing DSR requests
"""
def process_dsr(webhook, user, response_jwt_token):
    headers = response_headers(response_jwt_token)
    if webhook['type'] == 'ACCESS':
        return perform_access(user, headers)
    elif webhook['type'] == 'ERASURE':
        return perform_erasure(user, headers)

##########
# Server #
##########

"""
Create a simple server
"""
class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    """
    Respond with Hello World when someone goes to the page on a browser
    """
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Hello, world!')

    """
    Receive a webhook notification from Transcend
    """
    def do_POST(self):
        # Parse out the body
        content_length = int(self.headers['Content-Length'])
        body_str = self.rfile.read(content_length)

        # The Webhook body
        body = json.loads(body_str)

        # Verify that the request came from Transcend
        verify_transcend_webhook(self.headers)

        userIdentifier = body['extras']['profile']['identifier']

        # Determine whether the request should be blocked
        status = 'COMPILING'
        if IS_A_FRAUD.get(userIdentifier, False):
            status = 'ON_HOLD'
            # status = 'CANCELED'

        # Return 400 if user not found
        if userIdentifier not in MOCK_DATA:
            self.send_response(400)
            self.end_headers()
            response = io.BytesIO()
            self.wfile.write(response.getvalue())
            return

        # Respond with a 200 and the status
        self.send_response(200)
        self.end_headers()
        response = io.BytesIO()
        response.write(bytes(json.dumps({ 'status': status }), 'utf-8'))
        self.wfile.write(response.getvalue())

        # Process request async
        process = Thread(target=process_dsr, args=[body, MOCK_DATA[userIdentifier], self.headers['x-transcend-nonce']])
        process.start()

"""
The main server runner
"""
def main():
    # Create https server
    httpd = HTTPServer(('localhost', 4443), SimpleHTTPRequestHandler)
    if USE_HTTPS:
        httpd.socket = ssl.wrap_socket(
            httpd.socket,
            keyfile="ssl/private.key",
            certfile='ssl/certificate.pem',
            server_side=True
        )

    # Run
    print('https://localhost:4443' if USE_HTTPS else 'http://localhost:4443')
    httpd.serve_forever()

if __name__ == "__main__":
    main()

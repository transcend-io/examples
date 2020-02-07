# Server
from http.server import HTTPServer, BaseHTTPRequestHandler
import ssl

# core
import io
import json
import requests
from werkzeug.exceptions import Unauthorized
from threading import Thread

# JWTs
import jwt
from jwt.exceptions import DecodeError
from jwt.exceptions import InvalidKeyError

#################
# Configuration #
#################

# The API to post to Transcend THIS IS A SECRET, STORE SAFELY AND CYCLE REGULARLY
TRANSCEND_API_KEY = '4ff241e61c60288babed50097aab17eb38d97face63ac06923da85345f8ce559'

# The API to use with the sombra instance that encrypts the data before hitting Transcends servers THIS IS A SECRET, STORE SAFELY AND CYCLE REGULARLY
SOMBRA_API_KEY = 'jC1VbtN9eQ3r+eQHVK9UVILPQn76GOW65HrVUsBYl/I='

# The url of the sombra instance
# SOMBRA_URL = 'https://patreon.sombra.transcend.io'
SOMBRA_URL = 'https://patreon.sombra.dev.transcen.dental'
# SOMBRA_URL = 'https://localhost:5040'

# The url to respond to webhooks with
TRANSCEND_WEBHOOK_URL = SOMBRA_URL + '/v1/data-silo'

# The JWT audience
JWT_AUDIENCE="patreon"

# Whether to verify the JWT from Transcend, set to False to trust the JWT always
VERIFY_JWT = True

# Whether to trust self signed certs
TRUST_SELF_SIGNED_CERT = False

# Some test data
MOCK_DATA = {
    '19530621': {
        'gpa': 3.89,
        'name': 'Freddie Mercury',
        'id': '19530621'
    }
}

IS_A_FRAUD = {
    '19530621': False
}

###########
# Helpers #
###########

"""
Get the sombra public key, used to verify the coreIdentifier
"""
def get_transcend_public_key():
    res = requests.get(SOMBRA_URL + '/public-keys/sombra-general-signing-key', verify = not TRUST_SELF_SIGNED_CERT)
    return res.content

"""
Validate the sombra token and get the verified core identifer
"""
def get_core_identifier(headers):
    # A JWT that encodes the coreIdentifier like `{ "value": "12345" }`
    token = headers.get('x-sombra-token')  # Contains a signed user_id

    # Decode the jwt
    try:
        decoded = jwt.decode(
            bytes(token, 'utf-8'),
            get_transcend_public_key(),
            algorithms=['ES384'],
            audience=JWT_AUDIENCE,
            verify=VERIFY_JWT,  # Only validate in prod where the tokens are real
        )
        return decoded.get('value')
    except (DecodeError, InvalidKeyError):
        raise Unauthorized()


"""
Construct the headers to respond to webhooks with
"""
def response_headers(response_jwt_token):
    return {
        "authorization": "Bearer {}".format(TRANSCEND_API_KEY),
        "x-sombra-authorization": "Bearer {}".format(SOMBRA_API_KEY),
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
    print(outgoing_request_body)
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
        coreIdentifier = get_core_identifier(self.headers)

        # Determine whether the request should be blocked
        status = 'COMPILING'
        if IS_A_FRAUD[coreIdentifier]:
            status = 'ON_HOLD'
            # status = 'CANCELED'

        # Return 400 if user not found
        if coreIdentifier not in MOCK_DATA:
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
        process = Thread(target=process_dsr, args=[body, MOCK_DATA[coreIdentifier], self.headers['x-transcend-nonce']])
        process.start()

"""
The main server runner
"""
def main():
    # Create https server
    httpd = HTTPServer(('localhost', 4443), SimpleHTTPRequestHandler)
    httpd.socket = ssl.wrap_socket (httpd.socket, 
            keyfile="ssl/private.key", 
            certfile='ssl/certificate.pem', server_side=True)

    # Run
    print('https://localhost:4443')
    httpd.serve_forever()

if __name__ == "__main__":
    main()

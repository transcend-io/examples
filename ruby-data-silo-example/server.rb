require 'faraday'
require 'sinatra'
require 'jwt'
require 'dotenv'

Dotenv.load

########## ############### ###### ## #
#   Constants

# The API to post to Transcend THIS IS A SECRET, STORE SAFELY AND CYCLE REGULARLY
# This is a secret!!!
$TRANSCEND_API_KEY = ENV["TRANSCEND_API_KEY"]

# The API to use with the sombra instance that encrypts the data before hitting Transcends servers THIS IS A SECRET, STORE SAFELY AND CYCLE REGULARLY
# This is a secret!!!
$SOMBRA_API_KEY = ENV["SOMBRA_API_KEY"]

# The url of the sombra instance
$SOMBRA_URL = ENV["SOMBRA_URL"]

# The JWT audience
$JWT_AUDIENCE=ENV["JWT_AUDIENCE"]

# Whether to verify the JWT from Transcend, set to False to trust the JWT always -- in production you should always verify the JWT
$VERIFY_JWT = true

# Whether to trust self signed certs -- in production you should always check the cert
$TRUST_SELF_SIGNED_CERT = false

########## ############### ###### ## #
#    Derived Constants

# URLS
$DATA_SILO_PATH = $SOMBRA_URL + '/v1/data-silo'
$TRANSCEND_WEBHOOK_URL = $SOMBRA_URL + '/v1/data-silo'
$PUBLIC_KEY_URL = $SOMBRA_URL + '/public-keys/sombra-general-signing-key'

########## ############### ###### ## #
#    Mock Data
$MOCK_DATA = {
    'john+brandless@transcend.io' => {
       :gpa => 3.89,
       :name => 'Freddie Mercury',
       :id => '19530621'
    }
}

$IS_A_FRAUD = {
    19530621 => false
}

########## ############### ###### ## #
#    Server

# Respond with Hello World when someone goes to the page on a browser
get '/' do
    status 200
    'Hello world!'
end

# # Receive a webhook notification from Transcend
post '/' do
    payload = JSON.parse request.body.read
    nonce = request.env['HTTP_X_TRANSCEND_NONCE']
    token = request.env['HTTP_X_SOMBRA_TOKEN']

    begin
        coreIdentifier = get_core_identifier token
        dsr_status = 'COMPILING'


        if $IS_A_FRAUD[coreIdentifier]
            dsr_status = 'ON_HOLD'
        elsif ! ($MOCK_DATA.key?(coreIdentifier))
            status 204
            dsr_status = 'NOT_FOUND'
        else
            user = $MOCK_DATA[coreIdentifier]
            case payload['type']
            when 'ACCESS'
                perform_access(user, nonce)
            when 'ERASURE'
                perform_erasure(user, nonce)
            else
                status 400
                'Unknown DSR Request Type'
            end
        end

    rescue JWT::JWKError, JWT::DecodeError, JWT::InvalidAudError
        status 401
        dsr_status = 'Unauthorized'
    end

    { 'status': dsr_status}.to_json
end


########## ############### ###### ## #
#   Functions

# Pretend to make access request
def perform_access(user, nonce)
    formatted_data = user
    outgoing_request_body = {
        "profiles": [{
            "profileId": user[:id],
            "profileData": formatted_data,
        }],
    }

    # Signal that it has been completed.
    resp = Faraday.post($DATA_SILO_PATH) do |req|
        req.headers['Content-Type'] = 'application/json'
        req.headers['accept'] = 'application/json'
        req.headers['Authorization'] = 'Bearer ' + $TRANSCEND_API_KEY
        req.headers['x-sombra-authorization'] = 'Bearer ' + $SOMBRA_API_KEY
        req.headers['x-transcend-nonce'] = nonce
        req.body = outgoing_request_body.to_json
    end

end

# Pretend to make erasure
def perform_erasure(user, nonce)
    formatted_data = user
    outgoing_request_body = {
        "profiles": [{
            "profileId": user['id'],
        }],
        # Indicate that there is no further data being posted
        "status": "READY"
    }

    # Signal that it has been completed.
    resp = Faraday.put($DATA_SILO_PATH) do |req|
        req.headers['Content-Type'] = 'application/json'
        req.headers['accept'] = 'application/json'
        req.headers['Authorization'] = 'Bearer ' + $TRANSCEND_API_KEY
        req.headers['x-sombra-authorization'] = 'Bearer ' + $SOMBRA_API_KEY
        req.headers['x-transcend-nonce'] = nonce
        req.body = outgoing_request_body.to_json
    end
end

# Retrieve public key from Sombra
def transcend_public_key
    response = Faraday.get($PUBLIC_KEY_URL)
    OpenSSL::PKey.read(response.body)
end

# Retrieve core identifier
def get_core_identifier(token)
    # A JWT that encodes the coreIdentifier like `{ "value": "12345" }`
    options = { aud: $JWT_AUDIENCE, verify_aud: true, algorithm: 'ES384' }
    decoded_token = JWT.decode token, transcend_public_key, $VERIFY_JWT, options
    decoded_token[0]['value']
end

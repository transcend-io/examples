require 'faraday'
require 'sinatra'
require 'jwt'
require 'dotenv'

Dotenv.load('../.env')

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

# The audience on the JWT to verify. You can find your Organization URI at https://app.transcend.io/settings, which is the audience
$AUDIENCE = ENV["AUDIENCE"]

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
    },
    'david+test@transcend.io' => {
      :gpa => 1.3,
      :name => 'Mr. Privacy',
      :id => '19530622'
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
        validate_transcend_webhook token
        user_identifier = payload['extras']['profile']['identifier']


        if ! ($MOCK_DATA.key?(user_identifier))
            status 204
        else
            user = $MOCK_DATA[user_identifier]
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
    end

    {}.to_json
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
    # TODO: make x-sombra-authorization optional in this example
    resp = Faraday.post($DATA_SILO_PATH) do |req|
        req.headers['Content-Type'] = 'application/json'
        req.headers['accept'] = 'application/json'
        req.headers['Authorization'] = 'Bearer ' + $TRANSCEND_API_KEY
        req.headers['x-sombra-authorization'] = $SOMBRA_API_KEY ? 'Bearer ' + $SOMBRA_API_KEY : nil
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
    # TODO: make x-sombra-authorization optional in this example
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
# TODO: add authentication headers for multi-tenant Sombra in this example
def transcend_public_key
    connection = Faraday.new() do |conn|
      conn.request :authorization, 'Bearer', $TRANSCEND_API_KEY
      conn.method :get
    end
    response = connection.get($PUBLIC_KEY_URL)
    OpenSSL::PKey.read(response.body)
end

# Retrieve core identifier
def validate_transcend_webhook(token)
    options = {
      algorithm: 'ES384',
      aud: $AUDIENCE,
      verify_aud: true,
    }
    decoded_token = JWT.decode token, transcend_public_key, $VERIFY_JWT, options
    if decoded_token[0]['scope'] != 'coreIdentifier'
      raise "Saw unexpected scope in JWT"
    end
    decoded_token[0]['value']
end

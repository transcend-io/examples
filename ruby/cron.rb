require 'faraday'
require 'sinatra'
require 'jwt'
require 'dotenv'

Dotenv.load('../.env')

######################################
#             Constants              #
######################################

###
# API key scoped to the data silo: https://app.transcend.io/settings#Developer
###
# This is a secret!!!
$TRANSCEND_API_KEY = ENV["TRANSCEND_API_KEY"]

###
# DSR action to process. See event keys here: https://docs.transcend.io/docs/data-subject-requests#data-actions
####
$ACTION_TYPE = "ERASURE"

###
# ID of the data silo to process (found in the URL https://app.transcend.io/data-map/silo/<data-silo-id>)
###
$DATA_SILO_ID = "TODO"

###
# Headers used to authenticate to sombra and transcend
###
$headers = {
    'Authorization': 'Bearer ' + TRANSCEND_API_KEY,
}
$SOMBRA_URL = "https://multi-tenant.sombra.transcend.io"

# URLS
$DATA_SILO_PATH = $SOMBRA_URL + '/v1/data-silo'
$TRANSCEND_WEBHOOK_URL = $SOMBRA_URL + '/v1/data-silo'
$PUBLIC_KEY_URL = $SOMBRA_URL + '/public-keys/sombra-general-signing-key'


###
#  List out requests that need to be processed for a particular data silos/action combination
#  @param data_silo_id - The ID of the data silo to list pending requests for.
#  @param action_type - The type of action to process i.e. ACCESS | ERASURE | CONTACT_OPT_OUT...
###
def list_pending_requests(data_silo_id, action_type):
    resp = Faraday.get($DATA_SILO_PATH + '/' + data_silo_id + '/pending-requests?action_type=' + action_type, headers=$headers)
    # request = requests.get(SOMBRA_URL + "/v1/data-silo/" + data_silo_id + "/pending-requests/" + action_type, headers=headers, verify=False)
    if request.status_code == 200:
        return request.json()['items']
    else:
        print(request.request.body)
        raise Exception("Query failed to run by returning code of {}.".format(request.status_code))


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
    }

    # INSERT DELETION LOGIC HERE

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

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
def list_pending_requests(data_silo_id, action_type)
    # resp = Faraday.get($DATA_SILO_PATH + '/' + data_silo_id + '/pending-requests?action_type=' + action_type, headers=$headers)

    resp = Faraday.post($DATA_SILO_PATH + '/' + data_silo_id + '/pending-requests?action_type=' + action_type) do |req|
      req.headers['Content-Type'] = 'application/json'
      req.headers['accept'] = 'application/json'
      req.headers['Authorization'] = 'Bearer ' + $TRANSCEND_API_KEY
      req.body = outgoing_request_body.to_json
    end
    if resp.status == 200
        return request.json()['items']
    else
        puts response.request.body
        raise Exception.new "Query failed to run by returning code of #{request.status}"
    end

###
# Respond to webhook upon completion
# @param identifier - the identifier being responded to
# @param nonce - The nonce to respond to
###
def notify_completed(identifier, nonce)
    # Notify success
    outgoing_request_body = {
        "profiles": [{
            "profileId": identifier,
        }],
    }

    merged = dict({ "x-transcend-nonce": nonce })
    merged.update(headers)

    resp = Faraday.post($SOMBRA_URL + "/v1/data-silo") do |req|
      req.headers['x-transcend-nonce'] = nonce
      req.body = outgoing_request_body.to_json
    end
    if request.status == 200
        return True
    else
        puts request.request.body
        raise Exception.new "Request failed with status code #{request.status}"
    end
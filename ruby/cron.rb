require 'faraday'
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
# Sombra URL. Change if you are not using multi-tenant
###
$SOMBRA_URL = "https://multi-tenant.sombra.transcend.io"

###
# API key for sombra if you are not using multi-tenant
###
$SOMBRA_API_KEY = ENV["SOMBRA_API_KEY"]

###
# DSR action to process. See event keys here: https://docs.transcend.io/docs/data-subject-requests#data-actions
####
$ACTION_TYPE = "ACCESS"

###
# ID of the data silo to process (found in the URL https://app.transcend.io/data-map/silo/<data-silo-id>)
###
$DATA_SILO_ID = "TODO"


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
  puts 'here'
  resp = Faraday.get($DATA_SILO_PATH + '/' + data_silo_id + '/pending-requests/' + action_type) do |req|
    req.headers['Content-Type'] = 'application/json'
    req.headers['accept'] = 'application/json'
    req.headers['Authorization'] = 'Bearer ' + $TRANSCEND_API_KEY
    # If the sombra api key is set, use it
    # req.headers['x-sombra-authorization'] = 'Bearer ' + $SOMBRA_API_KEY
  end
  if resp.status == 200
    return resp.body.to_json['items']
  else
    puts resp.body.to_json
    raise Exception.new "Query failed to run by returning code of #{resp.status}"
  end
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


  resp = Faraday.post($SOMBRA_URL + "/v1/data-silo") do |req|
    req.headers['x-transcend-nonce'] = nonce
  end
  if resp.status == 200
    return True
  else
    puts resp.body.to_json
    raise Exception.new "Request failed with status code #{resp.status}"
  end
end

# ###
# # Perform the data subject request
# ###
def run_job(identifier, actionType)
  puts "TODO Implment action #{actionType} for identifier #{identifier}"
end

loop do
  results = list_pending_requests($DATA_SILO_ID, $ACTION_TYPE)
  puts "Processing: #{results.length()} requests"
  for result in results
    run_job(result['identifier'], $ACTION_TYPE)
    notify_completed(result['identifier'], result['nonce'])
  end
  if results.length() == 0
    break
  end
end

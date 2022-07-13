import requests
import json
"""
API key scoped to the data silo: https://app.transcend.io/settings#Developer
"""
TRANSCEND_API_KEY = "TODO"

"""
DSR action to process. See event keys here: https://docs.transcend.io/docs/data-subject-requests#data-actions
"""
ACTION_TYPE ="ERASURE"

"""
ID of the data silo to process (found in the URL https://app.transcend.io/data-map/silo/<data-silo-id>)
"""
DATA_SILO_ID = "TODO"

"""
Headers used to authenticate to sombra and transcend
"""
headers = {
    "Authorization": "Bearer " + TRANSCEND_API_KEY,
}
SOMBRA_URL = "https://multi-tenant.sombra.transcend.io"

"""
  List out requests that need to be processed for a particular data silos/action combination
  @param data_silo_id - The ID of the data silo to list pending requests for.
  @param action_type - The type of action to process i.e. ACCESS | ERASURE | CONTACT_OPT_OUT...
"""
def list_pending_requests(data_silo_id, action_type):
    request = requests.get(SOMBRA_URL + "/v1/data-silo/" + data_silo_id + "/pending-requests/" + action_type, headers=headers, verify=False)
    if request.status_code == 200:
        return request.json()['items']
    else:
        print(request.request.body)
        raise Exception("Query failed to run by returning code of {}.".format(request.status_code))

"""
Respond to webhook upon completion
@param identifier - the identifier being responded to
@param nonce - The nonce to respond to
"""
def notify_completed(identifier, nonce):
    # Notify success
    outgoing_request_body = {
        "profiles": [{
            "profileId": identifier,
        }],
    }

    merged = dict({ "x-transcend-nonce": nonce })
    merged.update(headers)
    request = requests.put(
        SOMBRA_URL + "/v1/data-silo",
        json=outgoing_request_body,
        headers=merged,
        verify=False
    )
    if request.status_code == 200:
        return True
    else:
        print(request.request.body)
        raise Exception("Request failed with status code {}.".format(request.status_code))

"""
Perform the data subject request
"""
def run_job(identifier, actionType):
    print("TODO: Implement action {} for identifier {}".format( actionType, identifier))


def main():

    while True:
        results = list_pending_requests(DATA_SILO_ID, ACTION_TYPE)
        print("Processing: {} requests".format(len(results)))
        for result in results:
            run_job(result['identifier'], ACTION_TYPE)
            notify_completed(result['identifier'], result['nonce'])

        if len(results) == 0:
            break
if __name__ == '__main__':
    main()

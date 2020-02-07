#!/bin/bash
set -e

##################################################################################
# Trust the certificate on your local machine
#
# Usage: `./trust_certificate.sh`
#
# NOTE: certificate needs to be created first
##################################################################################

# Trust the cert
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "ssl/certificate.pem"
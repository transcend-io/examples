#!/bin/bash
set -e

##################################################################################
# Create the ssl certificate
#
# Usage: `./create_certificate.sh`
#
# NOTE: only needs to be run when the certificate is replaced
##################################################################################


# Generate a key
openssl genrsa -out "ssl/private.key" 3072 -nodes

# Create the certificate
openssl req -new -x509 -key "ssl/private.key" -sha256 -config "ssl/server.cnf" -out "ssl/certificate.pem" -days 1000

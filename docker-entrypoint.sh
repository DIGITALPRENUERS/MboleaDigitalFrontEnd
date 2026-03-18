#!/bin/sh
set -eu

: "${BACKEND_URL:=http://localhost:8080}"

# Nginx image doesn't automatically expand environment variables in config.
# We substitute BACKEND_URL into the template at container start.
envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"


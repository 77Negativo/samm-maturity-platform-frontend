#!/bin/sh
set -eu

envsubst '${UPSTREAM_API_URL}' < /etc/nginx/templates/default.conf.template > /tmp/default.conf

exec nginx -g 'daemon off;' -c /etc/nginx/nginx.conf

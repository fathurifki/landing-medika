#!/bin/sh
set -eu

if [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "CERTBOT_EMAIL is required for certificate renewal."
  exit 1
fi

trap 'exit 0' TERM INT

while :; do
  certbot renew \
    --webroot \
    --webroot-path /var/www/certbot \
    --quiet \
    --no-random-sleep-on-renew

  kill -HUP 1 || true

  sleep 12h &
  wait $!
done

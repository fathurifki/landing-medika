#!/bin/sh
set -eu

if [ -z "${ROOT_DOMAIN:-}" ] || [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "ROOT_DOMAIN and CERTBOT_EMAIL are required for initial certificate issuance."
  exit 1
fi

marker="/etc/letsencrypt/.bootstrap-${ROOT_DOMAIN}"
renewal_conf="/etc/letsencrypt/renewal/${ROOT_DOMAIN}.conf"

if [ -f "${renewal_conf}" ] && [ ! -f "${marker}" ]; then
  echo "Certificate for ${ROOT_DOMAIN} already exists, skipping bootstrap."
  exit 0
fi

trap 'exit 0' TERM INT

echo "Waiting for nginx to start serving ACME challenges..."
sleep 5

while :; do
  if certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "${ROOT_DOMAIN}"; then
    break
  fi

  echo "Initial certificate request failed for ${ROOT_DOMAIN}. Retrying in 60 seconds..."
  sleep 60
done

rm -f "${marker}"

echo "Reloading nginx with the issued certificate..."
kill -HUP 1

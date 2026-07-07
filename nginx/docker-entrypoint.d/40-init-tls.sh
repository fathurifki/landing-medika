#!/bin/sh
set -eu

if [ -z "${ROOT_DOMAIN:-}" ]; then
  echo "ROOT_DOMAIN is required for nginx TLS bootstrap."
  exit 1
fi

live_dir="/etc/letsencrypt/live/${ROOT_DOMAIN}"
bootstrap_marker="/etc/letsencrypt/.bootstrap-${ROOT_DOMAIN}"

if [ -f "${live_dir}/fullchain.pem" ] && [ -f "${live_dir}/privkey.pem" ]; then
  exit 0
fi

mkdir -p "${live_dir}"

echo "Generating temporary self-signed certificate for ${ROOT_DOMAIN}..."
openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -days 1 \
  -keyout "${live_dir}/privkey.pem" \
  -out "${live_dir}/fullchain.pem" \
  -subj "/CN=${ROOT_DOMAIN}"

touch "${bootstrap_marker}"

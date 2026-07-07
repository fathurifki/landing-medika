/** @type {import('next').NextConfig} */
const path = require("path");
const { loadEnvConfig } = require("@next/env");

// Load .env from monorepo root so all packages share one file
loadEnvConfig(path.join(__dirname, "../.."));

// Parse NEXT_PUBLIC_IMAGE_URL to extract hostname and port for remotePatterns.
// Falls back to allowing the internal Docker service hostname.
function getImageRemotePatterns() {
  const patterns = [];

  // Always allow internal Docker service (server-side rendering)
  patterns.push({
    protocol: "http",
    hostname: "backend",
    port: "3001",
    pathname: "/files/**",
  });

  // Allow localhost for local development
  patterns.push({
    protocol: "http",
    hostname: "localhost",
    port: "3001",
    pathname: "/files/**",
  });

  // Parse production image URL from env and add a pattern for it
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      patterns.push({
        protocol: parsed.protocol.replace(":", ""),
        hostname: parsed.hostname,
        port: parsed.port || "",
        pathname: "/files/**",
      });
    } catch {
      // invalid URL — skip
    }
  }

  return patterns;
}

const nextConfig = {
  basePath: "/dashboard",
  output: "standalone",
  images: {
    remotePatterns: getImageRemotePatterns(),
    // The Next.js image optimizer fetches images server-side, which fails
    // whenever NEXT_PUBLIC_IMAGE_URL points at a host whose TLS cert the
    // container doesn't trust (e.g. the temporary self-signed cert nginx
    // bootstraps for local OrbStack testing — see nginx/docker-entrypoint.d/
    // 40-init-tls.sh). Browsers fetch images directly instead, so this only
    // trades away automatic resizing, not correctness.
    unoptimized: true,
  },
  // The bare root ("/") sits outside the basePath, so Next.js never routes it —
  // send visitors straight into the app instead of a dead-end 404.
  async redirects() {
    return [
      {
        source: "/",
        basePath: false,
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

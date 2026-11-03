import type { NextConfig } from "next";

// Shared by the build id and the service worker's cache name, so a deploy invalidates old caches.
const buildId = process.env.BUILD_ID ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mysql2"],
  allowedDevOrigins: ["192.168.0.9"],
  generateBuildId: async () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // Prerendered HTML defaults to s-maxage=1y: a CDN would pin an old build (and old chunk URLs). Always revalidate.
  headers: async () => [
    {
      source: "/((?!_next/static|_next/image|api/).*)",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    },
  ],
};

export default nextConfig;

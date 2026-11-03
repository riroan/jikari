import type { NextConfig } from "next";

// Shared by the build id and the service worker's cache name, so a deploy invalidates old caches.
const buildId = process.env.BUILD_ID ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mysql2"],
  allowedDevOrigins: ["192.168.0.9"],
  generateBuildId: async () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
};

export default nextConfig;

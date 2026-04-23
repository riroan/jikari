import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mysql2"],
  allowedDevOrigins: ["192.168.0.9"],
};

export default nextConfig;

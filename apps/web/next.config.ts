import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@resonansia/shared",
    "@resonansia/db",
    "@resonansia/core",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

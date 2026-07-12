import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Database exports are larger than Next's 1 MB Server Action default.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;

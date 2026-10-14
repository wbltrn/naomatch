import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode route indicator badge -- dev-only UI chrome with no
  // place showing during a live demo. Has no effect on production builds.
  devIndicators: false,
};

export default nextConfig;

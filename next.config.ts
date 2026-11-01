import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // End-to-end tests build into their own directory so they can run beside `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
};

export default nextConfig;

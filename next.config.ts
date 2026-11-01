import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // End-to-end tests build into their own directory so they can run beside `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  // The PDF renderer loads its built-in fonts at runtime by path, which file tracing can't see.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
};

export default nextConfig;

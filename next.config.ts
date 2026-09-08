import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A lockfile sits in the parent folder too; pin the root so tracing is right.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;

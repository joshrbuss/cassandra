import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure stockfish npm package is available at runtime in serverless functions
  // (not bundled by webpack/turbopack — needs filesystem access for WASM)
  serverExternalPackages: ["stockfish"],
};

export default nextConfig;

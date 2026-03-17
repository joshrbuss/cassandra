import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "./public/stockfish-18-lite-single.wasm",
      "./public/stockfish-18-lite-single.js",
    ],
  },
  // Ensure stockfish npm package is available at runtime in serverless functions
  // (not bundled by webpack/turbopack — needs filesystem access for WASM)
  serverExternalPackages: ["stockfish"],
};

export default nextConfig;

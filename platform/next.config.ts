import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "./public/stockfish-18-lite-single.wasm",
      "./public/stockfish-18-lite-single.js",
      "./node_modules/stockfish/**",
    ],
  },
  serverExternalPackages: ["stockfish"],
};

export default nextConfig;

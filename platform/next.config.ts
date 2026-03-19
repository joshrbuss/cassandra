import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

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

export default withAnalyzer(nextConfig);

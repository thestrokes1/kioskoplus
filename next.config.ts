import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Empty turbopack config silences the dev mode warning
  turbopack: {},
  webpack: (config) => {
    // Fix Windows case-sensitivity duplicate module issue
    // Ensures a single React instance across the entire build
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve("node_modules/react"),
      "react-dom": path.resolve("node_modules/react-dom"),
    };
    return config;
  },
};

export default nextConfig;

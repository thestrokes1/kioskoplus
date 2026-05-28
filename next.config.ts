import type { NextConfig } from "next";
import path from "path";
import os from "os";

const nextConfig: NextConfig = {
  // Empty turbopack config silences the dev mode warning
  turbopack: {},
  webpack: (config) => {
    // Fix Windows case-sensitivity duplicate module issue — only needed on Windows
    if (os.platform() === "win32") {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve("node_modules/react"),
        "react-dom": path.resolve("node_modules/react-dom"),
      };
    }
    return config;
  },
};

export default nextConfig;

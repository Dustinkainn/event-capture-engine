import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "https://10.2.9.105:3000",
    "https://10.0.4.55:3000",
    "https://192.168.56.1:3000"
  ],
  outputFileTracingRoot: path.resolve(".")
};

export default nextConfig;

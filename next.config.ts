import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};
export default nextConfig;

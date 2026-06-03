import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    let backendUrl = process.env.INTERNAL_API_URL;
    if (!backendUrl) {
      if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
        backendUrl = process.env.NEXT_PUBLIC_API_URL;
      } else if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.startsWith('http')) {
        backendUrl = process.env.EXPO_PUBLIC_API_URL;
      } else {
        backendUrl = "http://localhost:8000";
      }
    }
    const baseUrl = backendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${baseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

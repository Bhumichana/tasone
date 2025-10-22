import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // ปิด error overlay ใน development mode
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  // ปิด Fast Refresh error overlay
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;

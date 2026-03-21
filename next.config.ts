import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.almostcrackd.ai',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'presigned-url-uploads.almostcrackd.ai',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure.almostcrackd.ai',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

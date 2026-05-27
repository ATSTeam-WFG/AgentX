import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-9849080621014a8e9c12e5989f01a96e.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

export default withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NEXT_PUBLIC_APP_ENV !== "production",
})(nextConfig);

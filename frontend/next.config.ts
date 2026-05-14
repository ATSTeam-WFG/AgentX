import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const nextConfig: NextConfig = {
  // Service worker needs to be excluded from static export in development
  // but compiled in production builds
};

export default withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NEXT_PUBLIC_APP_ENV !== "production",
})(nextConfig);

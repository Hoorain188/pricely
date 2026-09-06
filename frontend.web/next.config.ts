import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "www.mega.pk" },
      { protocol: "https", hostname: "mega.pk" },
      { protocol: "https", hostname: "static-01.daraz.pk" },
      { protocol: "https", hostname: "img.drz.lazcdn.com" },
      { protocol: "https", hostname: "*.slatic.net" },
      { protocol: "https", hostname: "loremflickr.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;

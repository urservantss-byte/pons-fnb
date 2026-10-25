import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* App ini full client-side (auth via localStorage) — fitur cache/prefetch
     eksperimental Next 16 tidak dibutuhkan dan memicu warning "dropped segment". */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Proxy same-origin: browser selalu panggil /api & /branding pada host yang sama
  // dengan halamannya (localhost, IP LAN di HP, domain publik — semua jalan tanpa
  // mengubah config). Next meneruskan ke Express API di localhost:4000.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:4000/api/:path*" },
      { source: "/branding/:path*", destination: "http://localhost:4000/branding/:path*" },
    ];
  },
};

export default nextConfig;

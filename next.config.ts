import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents: true,
  // partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  webpack: (config) => {
    // Prevents webpack trying to bundle Node.js canvas (not needed in browser)
    config.externals = [...(config.externals ?? []), { canvas: 'canvas' }]
    return config
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The Word route reads the figure from disk; make sure it ships with the function.
  outputFileTracingIncludes: { "/api/worksheet/[version]": ["./public/figures/leaf-exchange.png"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

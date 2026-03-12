/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@chess-os/chess-core",
    "@chess-os/training",
    "@chess-os/db",
    "@chess-os/engine",
    "@chess-os/classifier",
  ],
  // Turbopack config (dev default in Next 16)
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  // Webpack config (production build)
  webpack: (config) => {
    // Workspace packages use .js extension imports (TypeScript ESM convention).
    // Map .js → .ts so webpack can resolve them from source.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

module.exports = nextConfig;

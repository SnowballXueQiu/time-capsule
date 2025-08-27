/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@time-capsule/types", "@time-capsule/sdk"],
  experimental: {
    webpackBuildWorker: true,
  },
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
      util: false,
    };

    // Handle IPFS and multiformats modules
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Ensure WASM files are treated as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
      generator: {
        filename: "static/wasm/[name].[hash][ext]",
      },
    });

    return config;
  },
};

module.exports = nextConfig;

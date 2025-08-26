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

    return config;
  },
};

module.exports = nextConfig;

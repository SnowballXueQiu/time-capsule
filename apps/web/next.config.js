/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@time-capsule/sdk", "@time-capsule/types"],
  experimental: {
    webpackBuildWorker: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;

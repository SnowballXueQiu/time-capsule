/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    transpilePackages: ["@time-capsule/sdk", "@time-capsule/types"],
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

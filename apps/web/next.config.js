/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Ignore WASM files in server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "encryptor_wasi_bg.wasm": "commonjs encryptor_wasi_bg.wasm",
      });
    }

    return config;
  },
};

module.exports = nextConfig;

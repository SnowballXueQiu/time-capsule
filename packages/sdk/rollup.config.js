import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";

// Node.js built-in modules that should be external
const nodeBuiltins = [
  "fs",
  "path",
  "crypto",
  "stream",
  "http",
  "https",
  "url",
  "util",
  "os",
  "net",
  "tls",
  "zlib",
  "events",
  "buffer",
  "querystring",
  "child_process",
  "cluster",
  "dgram",
  "dns",
  "domain",
  "readline",
  "repl",
  "tty",
  "vm",
  "worker_threads",
];

export default [
  // Main SDK build
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true,
        preferredBuiltins: false,
      }),
      commonjs({
        ignoreDynamicRequires: true,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outputToFilesystem: true,
      }),
    ],
    external: [
      "@mysten/sui",
      ...nodeBuiltins,
      "multiformats",
      "./encryption/wasm-loader",
    ],
  },
  // WASM loader build
  {
    input: "src/encryption/wasm-loader.ts",
    output: [
      {
        file: "dist/encryption/wasm-loader.js",
        format: "cjs",
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: "dist/encryption/wasm-loader.esm.js",
        format: "es",
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true,
        preferredBuiltins: false,
      }),
      commonjs({
        ignoreDynamicRequires: true,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outputToFilesystem: true,
      }),
    ],
    external: [...nodeBuiltins],
  },
  // Type definitions
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external: [
      "@mysten/sui",
      ...nodeBuiltins,
      "multiformats",
      "./encryption/wasm-loader",
    ],
  },
  {
    input: "src/encryption/wasm-loader.ts",
    output: {
      file: "dist/encryption/wasm-loader.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external: [...nodeBuiltins],
  },
];

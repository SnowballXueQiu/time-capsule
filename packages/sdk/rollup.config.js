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
  // JavaScript build
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        inlineDynamicImports: true, // Inline dynamic imports to avoid multiple chunks
      },
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true,
        inlineDynamicImports: true, // Inline dynamic imports to avoid multiple chunks
      },
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true,
        // Allow resolving workspace packages
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
      "@mysten/sui.js",
      ...nodeBuiltins,
      // External dependencies that should not be bundled
      "multiformats",
    ],
  },
  // Type definitions build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external: ["@mysten/sui.js", ...nodeBuiltins, "multiformats"],
  },
];

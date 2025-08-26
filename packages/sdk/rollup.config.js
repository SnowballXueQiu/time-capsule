import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";

export default [
  // JavaScript build
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true,
      },
    ],
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outputToFilesystem: true,
      }),
    ],
    external: ["@mysten/sui.js", "@time-capsule/types"],
  },
  // Type definitions build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external: ["@mysten/sui.js", "@time-capsule/types"],
  },
];

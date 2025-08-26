import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
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
      nodeResolve(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outputToFilesystem: true,
      }),
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
  },
];

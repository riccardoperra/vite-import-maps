import path from "node:path";
import { viteImportMaps } from "vite-import-maps";
import type { UserConfig } from "vite";

const root = import.meta.dirname;
const buildOutput = path.resolve(
  import.meta.dirname,
  "../../../dist/gh-29-with-dynamic-import-integrity",
);

export default {
  root,
  resolve: {
    alias: {
      "shared-lib": path.resolve(root, "shared-lib.ts"),
    },
  },
  build: {
    outDir: buildOutput,
    minify: false,
    rolldownOptions: {
      input: {
        index: path.resolve(root, "index.html"),
      },
      output: {
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  plugins: [
    viteImportMaps({
      integrity: "sha384",
      imports: ["shared-lib"],
      modulesOutDir: "@import-maps",
      outputAsFile: true,
    }),
  ],
} satisfies UserConfig;

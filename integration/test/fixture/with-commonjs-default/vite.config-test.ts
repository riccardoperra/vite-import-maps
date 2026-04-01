import path from "node:path";
import { viteImportMaps } from "vite-import-maps";
import type { UserConfig } from "vite";

const root = path.resolve(path.join(import.meta.dirname));

const buildOutput = path.resolve(
  import.meta.dirname,
  "../../__snapshot__/build-project-with-commonjs-default",
);

export default {
  root,
  resolve: {
    alias: {
      "shared-lib": path.resolve(path.join(root, "shared-lib.cts")),
    },
  },
  build: {
    outDir: buildOutput,
    minify: false,
    rolldownOptions: {
      input: {
        index: path.resolve(path.join(root, "./index.html")),
      },
      output: {
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [
    viteImportMaps({
      imports: ["shared-lib"],
      modulesOutDir: "@import-maps",
    }),
  ],
} satisfies UserConfig;

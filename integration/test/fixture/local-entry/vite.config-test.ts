import path from "node:path";
import { viteImportMaps } from "vite-import-maps";
import type { UserConfig } from "vite";

const root = import.meta.dirname;
const buildOutput = path.resolve(
  import.meta.dirname,
  "../../__snapshot__/build-project-with-local-entry",
);

export default {
  root,
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
      },
    },
  },
  plugins: [
    viteImportMaps({
      imports: [
        { name: "local-shared-lib", entry: "./shared-lib.ts" },
        { name: "local-shared-lib-alias", entry: "./shared-lib.ts" },
      ],
      modulesOutDir: "@import-maps",
    }),
  ],
} satisfies UserConfig;

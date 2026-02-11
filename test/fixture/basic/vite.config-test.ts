import path from "node:path";
import { viteImportMaps } from "../../../src/index.js";
import type { UserConfig } from "vite";

const root = path.resolve(path.join(import.meta.dirname));

const buildOutput = path.resolve(
  import.meta.dirname,
  "../../__snapshot__/build-project-with-right-import-maps",
);

export default {
  root,
  resolve: {
    // This is needed to resolve a file like a library
    alias: {
      "shared-lib": path.resolve(path.join(root, "shared-lib.ts")),
    },
  },
  build: {
    outDir: buildOutput,
    minify: false,
    rollupOptions: {
      input: {
        index: path.resolve(path.join(root, "./index.html")),
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

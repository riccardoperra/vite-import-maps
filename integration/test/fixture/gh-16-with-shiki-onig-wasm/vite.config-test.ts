import path from "node:path";
import { viteImportMaps } from "vite-import-maps";
import type { UserConfig } from "vite";

const root = path.resolve(path.join(import.meta.dirname));

const buildOutput = path.resolve(
  import.meta.dirname,
  "../../__snapshot__/build-gh-16-with-shiki-onig-wasm",
);

export default {
  root,
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
      imports: [
        {
          name: "shiki-wasm-init",
          entry: path.join(import.meta.dirname, "wasm-init.ts"),
        },
        {
          name: "shiki-wasm-url",
          entry: path.join(import.meta.dirname, "wasm-url.ts"),
        },
      ],
      modulesOutDir: "@import-maps",
    }),
  ],
} satisfies UserConfig;

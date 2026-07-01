import path from "node:path";
import { viteImportMaps } from "vite-import-maps";
import type { UserConfig } from "vite";
import type { Plugin } from "vite";

const root = path.resolve(path.join(import.meta.dirname));
const sharedLibPath = path.resolve(path.join(root, "shared-lib.ts"));

const buildOutput = path.resolve(
  import.meta.dirname,
  "../../__snapshot__/build-project-with-scoped-alias",
);

function importerAwareAliasPlugin(): Plugin {
  return {
    name: "importer-aware-alias",
    resolveId(id, importer) {
      if (id === "@acme/app" && importer) {
        return sharedLibPath;
      }
    },
  };
}

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
    importerAwareAliasPlugin(),
    viteImportMaps({
      imports: ["@acme/app"],
      modulesOutDir: "@import-maps",
    }),
  ],
} satisfies UserConfig;

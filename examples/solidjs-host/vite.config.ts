import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { vitePluginNativeImportMaps } from "../../src";
import * as path from "node:path";
import * as fs from "node:fs";

fs.copyFileSync(
  path.resolve(import.meta.dirname, '../solidjs-remote-counter/dist/solidjs-remote-counter.js'),
  path.resolve(import.meta.dirname, './public/solidjs-remote-counter.js'),
)

export default defineConfig({
  plugins: [
    solid(),
    vitePluginNativeImportMaps({
      log: true,
      imports: ["solid-js", "statebuilder", "solid-js/store", "solid-js/web"],
      modulesOutDir: "shared",
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        index: path.resolve("./index.html"),
      },
    },
  },
});

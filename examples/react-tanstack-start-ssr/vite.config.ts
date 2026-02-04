import fs from "node:fs";
import path from "node:path";
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

import { vitePluginNativeImportMaps } from "../../src";

fs.copyFileSync(
  path.resolve(
    import.meta.dirname,
    "../react-remote-counter/dist/react-remote-counter.js",
  ),
  path.resolve(import.meta.dirname, "./public/react-remote-counter.js"),
);


const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    vitePluginNativeImportMaps({
      shared: [
        { name: "react", entry: "./src/react-esm.ts" },
        { name: "react/jsx-runtime", entry: "./src/react-jsx-runtime.ts" },
        "react-dom",
      ],
      log: true,
      sharedOutDir: "shared",
      injectImportMapsToHtml: false,
    }),
  ],
});

export default config

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { vitePluginNativeImportMaps } from "../../src";
import fs from "node:fs";
import path from "node:path";

fs.copyFileSync(
  path.resolve(
    import.meta.dirname,
    "../react-remote-counter/dist/react-remote-counter.js",
  ),
  path.resolve(import.meta.dirname, "./public/react-remote-counter.js"),
);

// https://vite.dev/config/
export default defineConfig({
  build: {
    manifest: true,
  },
  plugins: [
    vitePluginNativeImportMaps({
      imports: [
        { name: "react", entry: "./src/react-esm.ts" },
        {
          name: "react/jsx-runtime",
          entry: "./src/react-jsx-runtime.ts",
        },
      ],
      integrity: "sha384",
      outputAsFile: true,
    }),
    react(),
  ],
});

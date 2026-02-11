import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import { viteImportMaps } from "../../src";
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
  plugins: [
    react(),
    viteImportMaps({
      integrity: 'sha384',
      imports: [
        { name: "react", entry: "./src/react-esm.ts", integrity: "sha256" },
        {
          name: "react/jsx-runtime",
          entry: "./src/react-jsx-runtime.ts",
          integrity: "sha512",
        },
        { name: "react-dom", entry: "react-dom"},
      ],
      log: true,
      modulesOutDir: "shared",
    }),
  ],
});

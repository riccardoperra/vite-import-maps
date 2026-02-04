import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

import { vitePluginNativeImportMaps } from "../../src";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePluginNativeImportMaps({
      shared: [
        { name: "react", entry: "./src/react-esm.ts" },
        { name: "react/jsx-runtime", entry: "./src/react-jsx-runtime.ts" },
        'react-dom'
      ],
      log: true,
      sharedOutDir: "shared",
    }),
  ],
});

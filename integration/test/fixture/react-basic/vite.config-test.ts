import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { viteImportMaps } from "vite-import-maps";

const root = path.resolve(import.meta.dirname);
const buildOutput = path.resolve(
  import.meta.dirname,
  "../../__snapshot__/build-react-project-with-import-maps",
);

export default defineConfig({
  root,
  build: {
    outDir: buildOutput,
    minify: true,
    rolldownOptions: {
      input: {
        index: path.resolve(root, "./index.html"),
      },
      output: {
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js",
      }
    },
  },
  plugins: [
    react(),
    viteImportMaps({
      imports: ["react", "react-dom", "react/jsx-runtime"],
      modulesOutDir: "@import-maps",
      outputAsFile: true,
    }),
  ],
});

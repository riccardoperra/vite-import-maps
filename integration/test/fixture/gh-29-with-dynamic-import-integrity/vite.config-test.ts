import path from "node:path";
import { viteImportMaps } from "vite-import-maps";
import type { UserConfig } from "vite";

const root = import.meta.dirname;
const buildOutput = path.resolve(
  import.meta.dirname,
  "../../../dist/gh-29-with-dynamic-import-integrity",
);

export default {
  root,
  resolve: {
    alias: {
      "shared-lib": path.resolve(root, "shared-lib.ts"),
    },
  },
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
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  plugins: [
    viteImportMaps({
      integrity: "sha384",
      imports: ["shared-lib"],
      modulesOutDir: "@import-maps",
      outputAsFile: true,
    }),
    {
      name: "test:pretty-print-import-map",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          const match = html.match(
            /(<script\b(?=[^>]*\btype\s*=\s*["']importmap["'])[^>]*>)([\s\S]*?)(<\/script>)/i,
          );
          if (!match) {
            throw new Error("Expected an import map script to format");
          }

          const formattedImportMap = JSON.stringify(
            JSON.parse(match[2]),
            null,
            2,
          );

          return html.replace(
            match[0],
            `${match[1]}\n${formattedImportMap}\n${match[3]}`,
          );
        },
      },
    },
  ],
} satisfies UserConfig;

import { pluginName } from "./config.js";
import { importMapBuildMarkerAttribute } from "./build-only/import-map-build-output.js";
import type { ImportMapBuildOutput } from "./build-only/import-map-build-output.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "./store.js";

export function pluginImportMapsInject(
  store: VitePluginImportMapsStore,
  buildOutput: ImportMapBuildOutput,
): Plugin {
  const name = pluginName("inject-html-import-map");
  return {
    name,
    transformIndexHtml(source, { bundle }) {
      // Development has no generated chunks to hash. Build output is filled
      // after Vite finishes rewriting chunks in generateBundle.
      const isBuild = bundle !== undefined;
      const importMap = isBuild
        ? buildOutput.placeholder
        : JSON.stringify(store.getImportMapAsJson());
      const attrs: Record<string, string> = { type: "importmap" };

      if (isBuild) {
        attrs[importMapBuildMarkerAttribute] = buildOutput.marker;
      }

      return {
        html: source,
        tags: [
          {
            tag: "script",
            attrs,
            children: importMap,
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

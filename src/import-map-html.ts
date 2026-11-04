import { pluginName } from "./config.js";
import { serializeImportMap } from "./serialize.js";
import type { ImportMapBuildOutput } from "./build-only/import-map-build-output.js";
import type { ImportMapScriptAttributes } from "./config.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "./store.js";

export function pluginImportMapsInject(
  store: VitePluginImportMapsStore,
  buildOutput: ImportMapBuildOutput,
  attributes?: ImportMapScriptAttributes,
): Plugin {
  const name = pluginName("inject-html-import-map");
  return {
    name,
    transformIndexHtml(source, { bundle }) {
      // Build HTML is filled after Vite finishes rewriting emitted chunks.
      const importMap =
        bundle !== undefined
          ? buildOutput.placeholder
          : serializeImportMap(store.getImportMapAsJson());

      return {
        html: source,
        tags: [
          {
            tag: "script",
            attrs: { ...attributes, type: "importmap" },
            children: importMap,
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

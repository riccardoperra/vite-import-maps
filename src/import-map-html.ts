import { pluginName } from "./config.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "./store.js";

export function pluginImportMapsInject(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("inject-html-import-map");
  return {
    name,
    transformIndexHtml(source) {
      const importMap = store.getImportMapAsJson();

      return {
        html: source,
        tags: [
          {
            tag: "script",
            attrs: { type: "importmap" },
            children: JSON.stringify(importMap),
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

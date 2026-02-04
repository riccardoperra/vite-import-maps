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
      const imports = {} as Record<string, string>;
      const integrity = {} as Record<string, string>
      store.importMapDependencies.forEach((dep) => {
        imports[dep.packageName] = dep.url;
        if (dep.integrity) {
          integrity[dep.url] = dep.integrity;
        }
      });

      const resolvedImports = store.importMapHtmlTransformer(
        imports,
        store.importMapDependencies
      );

      const importMap: Record<string, any> = {};
      importMap.imports = resolvedImports;
      if (Object.keys(integrity).length > 0) {
        importMap.integrity = integrity;
      }

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

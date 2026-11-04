import { pluginName } from "./config.js";
import { importMapJsonToJavaScript, serializeImportMap } from "./serialize.js";
import type { VitePluginImportMapsStore } from "./store.js";
import type { Plugin } from "vite";

const virtualImportMapId = "virtual:importmap";
const resolvedVirtualImportMapId = "\0" + virtualImportMapId;

export function pluginImportMapsAsModule(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("virtual-module-import-map");

  return {
    name,
    resolveId(id) {
      if (id === virtualImportMapId) {
        return resolvedVirtualImportMapId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualImportMapId) {
        await store.resolveDevelopmentDependencies();
        const content = serializeImportMap(store.getImportMapAsJson());
        return `
          export const importMapRaw = ${JSON.stringify(content)};
          export const importMap = ${importMapJsonToJavaScript(content)};
          export default importMap;
        `;
      }
    },
  };
}

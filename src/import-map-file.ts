import { pluginName } from "./config.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "./store.js";

interface PluginImportMapsAsFileOptions {
  name?: string;
}

export function pluginImportMapsAsFile(
  store: VitePluginImportMapsStore,
  options: PluginImportMapsAsFileOptions,
): Plugin {
  const { name = "import-map" } = options;

  return {
    name: pluginName("import-maps-as-file"),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === `/${name}.json`) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(store.getImportMapAsJson()));
        } else {
          next();
        }
      });
    },
    generateBundle() {
      const json = store.getImportMapAsJson();

      this.emitFile({
        type: "asset",
        fileName: `/${name}.json`,
        source: JSON.stringify(json, null, 2),
      });
    },
  };
}

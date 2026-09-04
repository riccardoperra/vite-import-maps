import { pluginName } from "./config.js";
import type { ImportMapBuildOutput } from "./build-only/import-map-build-output.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "./store.js";

interface PluginImportMapsAsFileOptions {
  name?: string;
}

export function pluginImportMapsAsFile(
  store: VitePluginImportMapsStore,
  options: PluginImportMapsAsFileOptions,
  buildOutput: ImportMapBuildOutput,
): Plugin {
  const { name = "import-map" } = options;

  return {
    name: pluginName("import-maps-as-file"),
    configureServer(server) {
      const url = `${server.config.base}${name}.json`;
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?", 1)[0] !== url) {
          next();
          return;
        }

        void store
          .resolveDevelopmentDependencies()
          .then(() => {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            res.end(JSON.stringify(store.getImportMapAsJson()));
          })
          .catch(next);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: `${name}.json`,
        source: buildOutput.placeholder,
      });
    },
  };
}

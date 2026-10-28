import { VitePluginImportMapsStore } from "./store.js";
import { pluginImportMapsBuildEnv } from "./build-only/build-plugin.js";
import { ImportMapBuildOutput } from "./build-only/import-map-build-output.js";
import { pluginImportMapsInject } from "./import-map-html.js";
import { pluginImportMapsDevelopmentEnv } from "./dev/dev-plugin.js";
import { pluginImportMapsAsFile } from "./import-map-file.js";
import { pluginImportMapsAsModule } from "./import-map-module.js";
import type { VitePluginImportMapsConfig } from "./config.js";
import type { Plugin } from "vite";

export type {
  DependencyIntegrityCheck,
  ImportMapScriptAttributes,
  ImportMapSignature,
  ImportMapTransformerFn,
  SharedDependencyConfig,
  SharedDependencyObjectConfig,
  VitePluginImportMapsConfig,
} from "./config.js";

export function viteImportMaps(
  options: VitePluginImportMapsConfig,
): Array<Plugin> {
  const { injectImportMapsToHtml = true, outputAsFile } = options;

  const plugins: Array<Plugin> = [];

  const store = new VitePluginImportMapsStore(options);
  const buildOutput = new ImportMapBuildOutput();

  plugins.push(...pluginImportMapsBuildEnv(store, buildOutput));
  plugins.push(pluginImportMapsDevelopmentEnv(store));

  if (injectImportMapsToHtml) {
    plugins.push(
      pluginImportMapsInject(
        store,
        buildOutput,
        options.importMapScriptAttributes,
      ),
    );
  }

  plugins.push(pluginImportMapsAsModule(store));

  if (outputAsFile) {
    const name = typeof outputAsFile === "string" ? outputAsFile : undefined;
    plugins.push(pluginImportMapsAsFile(store, { name }, buildOutput));
  }

  return plugins;
}

export default viteImportMaps;

import { VitePluginImportMapsStore } from "./store.js";
import { pluginImportMapsBuildEnv } from "./build-only/build-plugin.js";
import { pluginImportMapsInject } from "./import-map-html.js";
import { pluginImportMapsDevelopmentEnv } from "./dev/dev-plugin.js";
import { pluginImportMapsAsFile } from "./import-map-file.js";
import { pluginImportMapsAsModule } from "./import-map-module.js";
import type { VitePluginImportMapsConfig } from "./config.js";
import type { Plugin } from "vite";

export function viteImportMaps(
  options: VitePluginImportMapsConfig,
): Array<Plugin> {
  const { injectImportMapsToHtml = true, outputAsFile } = options;

  const plugins: Array<Plugin> = [];

  const store = new VitePluginImportMapsStore(options);

  plugins.push(...pluginImportMapsBuildEnv(store));
  plugins.push(pluginImportMapsDevelopmentEnv(store));

  if (injectImportMapsToHtml) {
    plugins.push(pluginImportMapsInject(store));
  }

  plugins.push(pluginImportMapsAsModule(store));

  if (outputAsFile) {
    const name = typeof outputAsFile === "string" ? outputAsFile : undefined;
    plugins.push(pluginImportMapsAsFile(store, { name }));
  }

  return plugins;
}

export default viteImportMaps;
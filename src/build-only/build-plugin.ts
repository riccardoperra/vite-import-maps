import { virtualChunksGeneratorPlugins } from "./virtual-chunk-generator.js";
import { virtualChunksResolverPlugin } from "./virtual-chunk-resolver.js";
import type { ImportMapBuildOutput } from "./import-map-build-output.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "../store.js";

export function pluginImportMapsBuildEnv(
  store: VitePluginImportMapsStore,
  buildOutput: ImportMapBuildOutput,
): Array<Plugin> {
  const plugins: Array<Plugin> = [];

  for (const dep of store.sharedDependencies) {
    store.addInput(dep);
  }

  plugins.push(...virtualChunksGeneratorPlugins(store, buildOutput));
  plugins.push(virtualChunksResolverPlugin(store));

  return plugins;
}

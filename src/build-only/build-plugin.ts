import { virtualChunksGeneratorPlugin } from "./virtual-chunk-generator.js";
import { virtualChunksResolverPlugin } from "./virtual-chunk-resolver.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "../store.js";

export function pluginImportMapsBuildEnv(
  store: VitePluginImportMapsStore,
): Array<Plugin> {
  const plugins: Array<Plugin> = [];

  for (const dep of store.sharedDependencies) {
    store.addInput(dep);
  }

  plugins.push(virtualChunksGeneratorPlugin(store));
  plugins.push(virtualChunksResolverPlugin(store));

  return plugins;
}

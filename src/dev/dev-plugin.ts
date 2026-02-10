import { pluginName } from "../config.js";
import { fileToUrl } from "../utils.js";
import type { Plugin } from "vite";
import type { VitePluginImportMapsStore } from "../store.js";

interface DevResolvedModule {
  name: string;
  path: string;
}

export function pluginImportMapsDevelopmentEnv(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("development");
  let latestBrowserHash: string | undefined = undefined;
  let cachedResolvedModules: Array<DevResolvedModule> = [];

  return {
    name,
    apply: "serve",
    // Using this hook since we are sure that deps/_metadata.json has been already created
    // and pluginContainer can resolve the right id without duplicating dependencies.
    // Here we will not inject any import map script, but we will track the dependencies into the store
    async transformIndexHtml(_, { server }) {
      if (!server) return;
      const { pluginContainer, config } = server,
        // This is just an improvement to avoid unnecessary calls to the pluginContainer
        // We get the depsOptimizer config to retrieve the latest browser hash.
        // Inside depsOptimizer we also have the dependencies with their own path,
        // but it's preferred to resolve those urls via pluginContainer.
        clientEnvironment = server.environments["client"],
        devOptimizer = clientEnvironment.depsOptimizer!;

      let resolvedModules: Array<DevResolvedModule>;

      if (devOptimizer.metadata.browserHash === latestBrowserHash) {
        resolvedModules = cachedResolvedModules;
      } else {
        resolvedModules = (
          await Promise.all(
            store.sharedDependencies.map(async (dependency) => {
              const resolvedId = await pluginContainer.resolveId(
                dependency.entry,
              );
              if (!resolvedId) return null;

              const path = fileToUrl(resolvedId.id, config.root);

              store.log &&
                server.config.logger.info(
                  `[${name}] Added ${dependency.entry}: ${path}`,
                  { timestamp: true },
                );

              return {
                name: dependency.name,
                path,
              };
            }),
          )
        ).filter((value) => !!value);
      }

      cachedResolvedModules = resolvedModules;
      latestBrowserHash = devOptimizer.metadata.browserHash;

      for (const { path: url, name: packageName } of resolvedModules) {
        store.addDependency({ packageName, url });
      }
    },
  };
}

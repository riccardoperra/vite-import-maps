import path from "node:path";
import { pluginName } from "../config.js";
import { fileToUrl, isAbsolute, normalizePath } from "../utils.js";
import type { Plugin, ViteDevServer } from "vite";
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
  let optimizerWarningLogged = false;
  let pendingResolution: Promise<void> | undefined;

  async function resolveDependencies(server: ViteDevServer): Promise<void> {
    const { config } = server;
    const clientEnvironment = server.environments["client"];
    const pluginContainer = server.pluginContainer;
    const devOptimizer = clientEnvironment.depsOptimizer;

    if (!devOptimizer && !optimizerWarningLogged) {
      config.logger.warn(
        `[${name}] Vite dependency optimizer is unavailable; import-map entries will be resolved on every request.`,
      );
      optimizerWarningLogged = true;
    }

    const browserHash = devOptimizer?.metadata.browserHash;
    let resolvedModules = cachedResolvedModules;
    if (!browserHash || browserHash !== latestBrowserHash) {
      resolvedModules = await Promise.all(
        store.sharedDependencies.map(async (dependency) => {
          const entry = dependency.localFile
            ? normalizePath(
                isAbsolute(dependency.entry)
                  ? dependency.entry
                  : path.resolve(config.root, dependency.entry),
              )
            : dependency.entry;
          const resolvedId = await pluginContainer.resolveId(entry);
          if (!resolvedId) {
            throw new Error(
              `[${name}] Could not resolve import-map dependency "${dependency.name}" from "${dependency.entry}". Install the package or check the entry path relative to the Vite root (${config.root}).`,
            );
          }

          const url = isAbsolute(resolvedId.id)
            ? fileToUrl(resolvedId.id, config.root)
            : `/@id/${resolvedId.id.replace(/\0/g, "__x00__")}`;
          return {
            name: dependency.name,
            path: `${config.base || "/"}${url.slice(1)}`,
          };
        }),
      );
    }

    cachedResolvedModules = resolvedModules;
    latestBrowserHash = browserHash;
    store.clearDependencies();
    for (const { path: url, name: packageName } of resolvedModules) {
      store.addDependency({ packageName, url });
    }
  }

  function ensureDependencies(server: ViteDevServer): Promise<void> {
    if (!pendingResolution) {
      pendingResolution = resolveDependencies(server).finally(() => {
        pendingResolution = undefined;
      });
    }
    return pendingResolution;
  }

  return {
    name,
    apply: "serve",
    configureServer(server) {
      store.setDevelopmentResolver(() => ensureDependencies(server));
    },
    async transformIndexHtml(_, { server }) {
      if (!server) return;
      await ensureDependencies(server);
    },
  };
}

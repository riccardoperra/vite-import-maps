import path from "node:path";
import { createHash } from "node:crypto";
import { pluginName } from "../config.js";
import {
  VIRTUAL_ID_PREFIX,
  getVirtualFileName,
} from "./virtual-chunk-resolver.js";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";
import type { Plugin, ResolvedConfig } from "vite";

export function virtualChunksGeneratorPlugin(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("build:virtual");
  const virtualModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  const localModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  let config!: ResolvedConfig;

  return {
    name,
    apply: "build",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    buildStart() {
      for (const input of store.inputs) {
        if (input.localFile) {
          // a local file doesn't have to be handled like a virtual
          // since I expect their source is already correct and doesn't
          // need to be transformed
          const id = path.resolve(input.idToResolve);
          if (!localModules.has(id)) {
            this.emitFile({
              type: "chunk",
              name: input.entrypoint,
              id,
              preserveSignature: "strict",
            });
          }
          localModules.set(id, input);
        } else {
          const id = getVirtualFileName(input.normalizedDependencyName);
          if (!virtualModules.has(id)) {
            this.emitFile({
              type: "chunk",
              name: input.entrypoint,
              id,
              preserveSignature: "strict",
            });
          }
          virtualModules.set(id, input);
        }
      }
    },
    // We'll get here the final name of the generated chunk
    // to track the import-maps dependencies
    generateBundle(_, bundle) {
      store.clearDependencies();

      const keys = Object.keys(bundle);
      for (const key of keys) {
        const entry = bundle[key];
        if (entry.type !== "chunk") continue;

        const handledModules = new Map([
          ...virtualModules.entries(),
          ...localModules.entries(),
        ]);

        if (
          entry.facadeModuleId &&
          (entry.facadeModuleId.startsWith(VIRTUAL_ID_PREFIX) ||
            path.isAbsolute(entry.facadeModuleId))
        ) {
          const entryImportMap = handledModules.get(entry.facadeModuleId);
          if (!entryImportMap) continue;

          // TODO: https://vite.dev/guide/backend-integration
          entry.isEntry = false;

          let integrity: string | undefined;
          if (entryImportMap.integrity !== false) {
            const algorithm =
              typeof entryImportMap.integrity === "string"
                ? entryImportMap.integrity
                : "sha384";
            integrity = `${algorithm}-${createHash(algorithm)
              .update(entry.code)
              .digest("base64")}`;
          }

          const url = `./${entry.fileName}`,
            packageName = entryImportMap.originalDependencyName;
          store.addDependency({ url, packageName, integrity });
          config.logger.info(`[${name}] Added ${packageName}: ${url}`, {
            timestamp: true,
          });
        }
      }
    },
  };
}

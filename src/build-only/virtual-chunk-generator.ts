import { createHash } from "node:crypto";
import * as path from "node:path";
import { styleText } from "node:util";
import { createLogger } from "vite";
import { pluginName } from "../config.js";
import { isAbsolute, normalizePath } from "../utils.js";
import {
  VIRTUAL_ID_PREFIX,
  getVirtualFileName,
} from "./virtual-chunk-resolver.js";
import type { ImportMapBuildOutput } from "./import-map-build-output.js";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";
import type { Plugin } from "vite";
import type { OutputBundle, OutputChunk } from "rolldown";

export function virtualChunksGeneratorPlugins(
  store: VitePluginImportMapsStore,
  buildOutput: ImportMapBuildOutput,
): Array<Plugin> {
  const name = pluginName("build:virtual");
  const virtualModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  const localModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  const logger = createLogger(undefined, {
    prefix: name,
  });
  let root = process.cwd();

  function findImportMapEntrypoint(
    facadeModuleId: string | null,
  ): ImportMapBuildChunkEntrypoint | undefined {
    if (
      !facadeModuleId ||
      (!facadeModuleId.startsWith(VIRTUAL_ID_PREFIX) &&
        !isAbsolute(facadeModuleId))
    ) {
      return;
    }

    const normalizedFacadeModuleId = normalizePath(facadeModuleId);
    return (
      virtualModules.get(normalizedFacadeModuleId) ??
      localModules.get(normalizedFacadeModuleId)
    );
  }

  function forEachImportMapChunk(
    bundle: OutputBundle,
    callback: (
      entry: OutputChunk,
      entryImportMap: ImportMapBuildChunkEntrypoint,
    ) => void,
  ): void {
    for (const entry of Object.values(bundle)) {
      if (entry.type !== "chunk") continue;

      const entryImportMap = findImportMapEntrypoint(entry.facadeModuleId);
      if (!entryImportMap) continue;

      callback(entry, entryImportMap);
    }
  }

  function collectDependencies(bundle: OutputBundle): void {
    store.clearDependencies();

    forEachImportMapChunk(bundle, (entry, entryImportMap) => {
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

      const url = `./${entry.fileName}`;
      const packageName = entryImportMap.originalDependencyName;
      store.addDependency({ url, packageName, integrity });
    });
  }

  const generator: Plugin = {
    name,
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      logger.info("Emit chunks for exposed dependencies", { timestamp: true });
      for (const input of store.inputs) {
        if (input.localFile) {
          // a local file doesn't have to be handled like a virtual
          // since I expect their source is already correct and doesn't
          // need to be transformed
          const id = isAbsolute(input.idToResolve)
            ? normalizePath(input.idToResolve)
            : normalizePath(path.resolve(root, input.idToResolve));
          if (!localModules.has(id)) {
            if (store.log) {
              console.info(
                `   ${styleText("cyanBright", `${input.normalizedDependencyName}:`)} %s`,
                id,
              );
            }

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
            if (store.log) {
              console.info(
                `   ${styleText("cyanBright", `${input.normalizedDependencyName}`)} %s`,
                id,
              );
            }

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
    generateBundle(_, bundle) {
      logger.info("Prepare chunks for import map", {
        timestamp: true,
      });

      forEachImportMapChunk(bundle, (entry) => {
        // TODO: https://vite.dev/guide/backend-integration
        entry.isEntry = false;
      });
    },
  };

  const finalizer: Plugin = {
    name: pluginName("build:finalize"),
    apply: "build",
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        // Vite can still rewrite dynamic-import preload dependencies in its
        // normal generateBundle hooks, so integrity must be calculated here.
        collectDependencies(bundle);

        if (store.log) {
          store.importMapDependencies.forEach((value, key) => {
            console.info(
              `   ${styleText("cyanBright", `${key}:`)} %s`,
              value.url,
            );
          });
        }

        buildOutput.finalize(bundle, store);
      },
    },
  };

  return [generator, finalizer];
}

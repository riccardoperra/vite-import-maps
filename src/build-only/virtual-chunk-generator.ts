import { createHash } from "node:crypto";
import * as path from "node:path/posix";
import { styleText } from "node:util";
import { createLogger } from "vite";
import { pluginName } from "../config.js";
import {
  VIRTUAL_ID_PREFIX,
  getVirtualFileName,
} from "./virtual-chunk-resolver.js";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";
import type { Plugin } from "vite";

export function virtualChunksGeneratorPlugin(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("build:virtual");
  const virtualModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  const localModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  const logger = createLogger(undefined, {
    prefix: name,
  });

  return {
    name,
    apply: "build",
    buildStart() {
      logger.info("Emit chunks for exposed dependencies", { timestamp: true });
      for (const input of store.inputs) {
        if (input.localFile) {
          // a local file doesn't have to be handled like a virtual
          // since I expect their source is already correct and doesn't
          // need to be transformed
          const id = path.normalize(path.resolve(input.idToResolve));
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
    // We'll get here the final name of the generated chunk
    // to track the import-maps dependencies
    generateBundle(_, bundle) {
      store.clearDependencies();
      logger.info("Collect dependencies and generate import map", {
        timestamp: true,
      });

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
          const facadeModuleId = path.normalize(entry.facadeModuleId);
          const entryImportMap = handledModules.get(facadeModuleId);
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
        }
      }

      if (store.log) {
        store.importMapDependencies.forEach((value, key) => {
          console.info(
            `   ${styleText("cyanBright", `${key}:`)} %s`,
            value.url,
          );
        });
      }
    },
  };
}

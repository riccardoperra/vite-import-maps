/*
 * Copyright 2025 Riccardo Perra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from "node:path";
import { pluginName } from "../config.js";
import {
  VIRTUAL_ID_PREFIX,
  getVirtualFileName,
  virtualChunksResolverPlugin,
} from "./virtual-chunk-resolver.js";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";
import type { Plugin, ResolvedConfig } from "vite";

export function buildWithVirtual(
  store: VitePluginImportMapsStore,
): Array<Plugin> {
  const name = pluginName("build:virtual");
  const virtualModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  const localModules = new Map<string, ImportMapBuildChunkEntrypoint>();
  let config!: ResolvedConfig;

  function virtualChunksApplierPlugin(): Plugin {
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

            const url = `./${entry.fileName}`,
              packageName = entryImportMap.originalDependencyName;
            store.addDependency({ url, packageName });
            config.logger.info(`[${name}] Added ${packageName}: ${url}`, {
              timestamp: true,
            });
          }
        }
      },
    };
  }

  return [virtualChunksResolverPlugin(store), virtualChunksApplierPlugin()];
}

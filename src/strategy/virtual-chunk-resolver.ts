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

import { pluginName } from "../config.js";
import type { ImportMapBuildChunkEntrypoint, VitePluginImportMapsStore } from "../store.js";
import type { Plugin } from "vite";

export const VIRTUAL_ID_PREFIX = `\0virtual:import-map-chunk`;

export function getVirtualFileName(name: string) {
  return `${VIRTUAL_ID_PREFIX}/${name}`;
}

export function virtualChunksResolverPlugin(store: VitePluginImportMapsStore): Plugin {
  return {
    name: pluginName("build:virtual-chunks-loader"),
    apply: "build",
    resolveId(id) {
      if (this.environment.name === 'ssr') return;
      if (id.startsWith(VIRTUAL_ID_PREFIX)) {
        const normalizedId = id.slice(VIRTUAL_ID_PREFIX.length + 1);
        return {
          id,
          meta: {
            info: store.inputs.find(
              (input) => input.normalizedDependencyName === normalizedId,
            ),
          },
        };
      }
    },
    async load(id) {
      if (this.environment.name === "ssr") return;
      if (!id.startsWith(VIRTUAL_ID_PREFIX)) {
        return;
      }
      const virtualModuleInfo = this.getModuleInfo(id);
      if (!virtualModuleInfo) {
        return;
      }
      const chunk = virtualModuleInfo.meta[
        "info"
      ] as ImportMapBuildChunkEntrypoint;

      const resolvedId = await this.resolve(chunk.idToResolve);
      if (!resolvedId) {
        return;
      }

      let hasDefaultExport = false;
      const [fileName] = resolvedId.id.split("?");
      const moduleInfo = this.getModuleInfo(fileName);

      if (moduleInfo) {
        hasDefaultExport = moduleInfo.hasDefaultExport ?? false;
        if (!hasDefaultExport) {
          // commonjs workarounds to detect default export
          // and then add it to the virtual chunk
          if (
            "commonjs" in moduleInfo.meta &&
            moduleInfo.meta.commonjs.isCommonJS
          ) {
            const requires = moduleInfo.meta.commonjs.requires;
            if (Array.isArray(requires)) {
              for (const require of requires) {
                if (require.resolved) {
                  const innerResolvedId = this.getModuleInfo(
                    require.resolved.id,
                  );
                  if (!innerResolvedId) break;
                  hasDefaultExport = innerResolvedId.hasDefaultExport || false;
                  if (hasDefaultExport) break;
                  if (innerResolvedId.exports?.includes("__require")) {
                    hasDefaultExport = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      let code = `export * from "${chunk.originalDependencyName}"`;
      if (hasDefaultExport) {
        code += `\nexport { default } from '${chunk.originalDependencyName}'`;
      }

      return {
        moduleSideEffects: "no-treeshake",
        code,
      };
    },
  };
}

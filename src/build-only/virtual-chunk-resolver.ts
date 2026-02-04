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

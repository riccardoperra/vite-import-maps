import { existsSync, readFileSync } from "node:fs";
import { pluginName } from "../config.js";
import {
  buildCommonJsWrapperCode,
  collectCommonJsNamedExports,
  collectCommonJsNamedExportsFromAst,
  getParseLang,
  isVite8CommonJsModule,
} from "./commonjs.js";
import type { Plugin } from "vite";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";

export const VIRTUAL_ID_PREFIX = `\0virtual:import-map-chunk`;

export function getVirtualFileName(name: string) {
  return `${VIRTUAL_ID_PREFIX}/${name}`;
}

export function virtualChunksResolverPlugin(
  store: VitePluginImportMapsStore,
): Plugin {
  return {
    name: pluginName("build:virtual-chunks-loader"),
    apply: "build",
    resolveId(id) {
      if (this.environment.name === "ssr") return;
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
      const chunk: ImportMapBuildChunkEntrypoint = virtualModuleInfo.meta[
        "info"
      ] as ImportMapBuildChunkEntrypoint;

      const resolvedId = await this.resolve(chunk.idToResolve);
      if (!resolvedId) {
        return;
      }

      const [fileName] = resolvedId.id.split("?");
      const moduleInfo =
        this.getModuleInfo(fileName) ??
        (await this.load({
          id: fileName,
          resolveDependencies: true,
        }));

      const isCjs =
        isVite8CommonJsModule(moduleInfo?.inputFormat, fileName) ||
        // Fallback for Vite < 8 which still uses rollup/esbuild
        "commonjs" in moduleInfo.meta;

      if (isCjs) {
        const commonJsNamedExports =
          await collectCommonJsNamedExports(fileName);
        return {
          moduleSideEffects: "no-treeshake",
          code: buildCommonJsWrapperCode(
            chunk.originalDependencyName,
            fileName,
            commonJsNamedExports,
          ),
        };
      }

      const code = `export * from "${chunk.originalDependencyName}"`;

      return {
        moduleSideEffects: "no-treeshake",
        code,
      };
    },
  };
}

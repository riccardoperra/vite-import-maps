import path from "node:path";
import { styleText } from "node:util";
import { createLogger } from "vite";
import { pluginName } from "../config.js";
import { isAbsolute, normalizePath } from "../utils.js";
import {
  buildCommonJsWrapperCode,
  collectCommonJsNamedExports,
  isVite8CommonJsModule,
} from "./commonjs.js";
import type { Plugin } from "vite";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";

export const VIRTUAL_ID_PREFIX = `\0virtual:import-map-chunk`;

export function getVirtualFileName(name: string): string {
  return `${VIRTUAL_ID_PREFIX}/${name}`;
}

export function virtualChunksResolverPlugin(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("build:virtual-chunks-loader");
  const logger = createLogger(store.log ? "info" : "silent", {
    prefix: name,
  });
  let root = process.cwd();

  return {
    name,
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    resolveId(this, id) {
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

      const entry = chunk.localFile
        ? normalizePath(
            isAbsolute(chunk.idToResolve)
              ? chunk.idToResolve
              : path.resolve(root, chunk.idToResolve),
          )
        : chunk.idToResolve;
      const resolvedId = await this.resolve(entry);

      if (!resolvedId) {
        logger.warn(`Could not resolve dependency for ${chunk.idToResolve}`, {
          timestamp: true,
        });
        return;
      }

      const [_fileName] = resolvedId.id.split("?");
      const fileName = _fileName;
      // Another alias may have started loading this module already. Wait for
      // its exports to be available before deciding whether to expose default.
      const moduleInfo = await this.load({
        id: fileName,
        resolveDependencies: true,
      });

      const isCjs =
        isVite8CommonJsModule(moduleInfo.inputFormat, fileName) ||
        // Fallback for Vite < 8 which still uses rollup/esbuild
        ("commonjs" in moduleInfo.meta &&
          moduleInfo.meta.commonjs.isCommonJS !== false);

      const dependencyName = JSON.stringify(entry);
      let code = `export * from ${dependencyName};`;

      if (moduleInfo.exports.includes("default")) {
        code += `\nexport { default } from ${dependencyName};`;
      }

      if (isCjs) {
        const commonJsNamedExports =
          await collectCommonJsNamedExports(fileName);

        code = buildCommonJsWrapperCode(entry, fileName, commonJsNamedExports);
      }

      if (store.log) {
        logger.info(`Resolve ${chunk.idToResolve}`, {
          timestamp: true,
        });
        console.log(
          `   ${styleText("cyanBright", "Path:")} %s`,
          path.relative(process.cwd(), moduleInfo.id),
        );
        console.log(
          `   ${styleText("cyanBright", "Format:")} %s`,
          isCjs ? styleText("yellow", "cjs") : styleText("green", "esm"),
        );
      }

      return {
        moduleSideEffects: "no-treeshake",
        code,
      };
    },
  };
}

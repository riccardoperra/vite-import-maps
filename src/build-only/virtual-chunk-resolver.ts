import path from "node:path/posix";
import { styleText } from "node:util";
import { createLogger } from "vite";
import { pluginName } from "../config.js";
import { normalizePath } from "../utils.js";
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

export function getVirtualFileName(name: string) {
  return `${VIRTUAL_ID_PREFIX}/${name}`;
}

function getNormalizedVirtualModuleName(id: string): string {
  return id.slice(VIRTUAL_ID_PREFIX.length + 1).split("?", 1)[0]!;
}

function getVirtualChunkInput(
  store: VitePluginImportMapsStore,
  id: string,
): ImportMapBuildChunkEntrypoint | undefined {
  if (!id.startsWith(VIRTUAL_ID_PREFIX)) {
    return;
  }

  const normalizedId = getNormalizedVirtualModuleName(id);
  return store.inputs.find(
    (input) => input.normalizedDependencyName === normalizedId,
  );
}

export function virtualChunksResolverPlugin(
  store: VitePluginImportMapsStore,
): Plugin {
  const name = pluginName("build:virtual-chunks-loader");
  const logger = createLogger(store.log ? "info" : "silent", {
    prefix: name,
  });
  let root = "";

  return {
    name,
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    resolveId(this, id) {
      if (this.environment.name === "ssr") return;
      if (id.startsWith(VIRTUAL_ID_PREFIX)) {
        const chunk = getVirtualChunkInput(store, id);
        if (!chunk) {
          return;
        }

        return {
          id,
          meta: {
            info: chunk,
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
      const chunk =
        (virtualModuleInfo?.meta["info"] as
          | ImportMapBuildChunkEntrypoint
          | undefined) ?? getVirtualChunkInput(store, id);

      if (!chunk) {
        return;
      }

      const fallbackImporter = root
        ? normalizePath(`${root}/index.html`)
        : undefined;
      const resolvedId =
        (await this.resolve(chunk.idToResolve)) ??
        (fallbackImporter
          ? await this.resolve(chunk.idToResolve, fallbackImporter)
          : undefined);

      if (!resolvedId) {
        logger.warn(`Could not resolve dependency for ${chunk.idToResolve}`, {
          timestamp: true,
        });
        return;
      }

      const [_fileName] = resolvedId.id.split("?");
      const fileName = _fileName;
      const moduleInfo =
        this.getModuleInfo(fileName) ??
        (await this.load({
          id: fileName,
          resolveDependencies: true,
        }));

      const isCjs =
        isVite8CommonJsModule(moduleInfo.inputFormat, fileName) ||
        // Fallback for Vite < 8 which still uses rollup/esbuild
        ("commonjs" in moduleInfo.meta &&
          moduleInfo.meta.commonjs.isCommonJS !== false);

      let code = `export * from "${chunk.originalDependencyName}"`;

      if (isCjs) {
        const commonJsNamedExports =
          await collectCommonJsNamedExports(fileName);

        code = buildCommonJsWrapperCode(
          chunk.originalDependencyName,
          fileName,
          commonJsNamedExports,
        );
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

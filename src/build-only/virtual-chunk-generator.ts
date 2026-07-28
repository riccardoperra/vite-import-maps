import { createHash } from "node:crypto";
import * as path from "node:path";
import { styleText } from "node:util";
import { createLogger } from "vite";
import { pluginName } from "../config.js";
import { isAbsolute, normalizePath } from "../utils.js";
import { getVirtualFileName } from "./virtual-chunk-resolver.js";
import type { ImportMapBuildOutput } from "./import-map-build-output.js";
import type {
  ImportMapBuildChunkEntrypoint,
  VitePluginImportMapsStore,
} from "../store.js";
import type { Plugin } from "vite";

function calculateIntegrity(
  integrityConfig: ImportMapBuildChunkEntrypoint["integrity"],
  code: string,
): string | undefined {
  if (integrityConfig === false) return;

  const algorithm =
    typeof integrityConfig === "string" ? integrityConfig : "sha384";
  return `${algorithm}-${createHash(algorithm).update(code).digest("base64")}`;
}

export function virtualChunksGeneratorPlugins(
  store: VitePluginImportMapsStore,
  buildOutput: ImportMapBuildOutput,
): Array<Plugin> {
  const name = pluginName("build:virtual");
  const modules = new Map<string, Array<ImportMapBuildChunkEntrypoint>>();
  const logger = createLogger(undefined, {
    prefix: name,
  });
  let root = process.cwd();

  const generator: Plugin = {
    name,
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      logger.info("Emit chunks for exposed dependencies", { timestamp: true });
      modules.clear();

      for (const input of store.inputs) {
        const id = input.localFile
          ? isAbsolute(input.idToResolve)
            ? normalizePath(input.idToResolve)
            : normalizePath(path.resolve(root, input.idToResolve))
          : getVirtualFileName(input.normalizedDependencyName);
        const registeredInputs = modules.get(id);

        if (registeredInputs) {
          registeredInputs.push(input);
          continue;
        }

        modules.set(id, [input]);
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
    },
    generateBundle(_, bundle) {
      logger.info("Prepare chunks for import map", {
        timestamp: true,
      });

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || !output.facadeModuleId) continue;
        const inputs = modules.get(normalizePath(output.facadeModuleId));
        if (!inputs) continue;

        // TODO: https://vite.dev/guide/backend-integration
        output.isEntry = false;
      }
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
        store.clearDependencies();

        for (const output of Object.values(bundle)) {
          if (output.type !== "chunk" || !output.facadeModuleId) continue;
          const inputs = modules.get(normalizePath(output.facadeModuleId));
          if (!inputs) continue;

          for (const input of inputs) {
            store.addDependency({
              packageName: input.originalDependencyName,
              url: `./${output.fileName}`,
              integrity: calculateIntegrity(input.integrity, output.code),
            });
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

        buildOutput.finalize(bundle, store);
      },
    },
  };

  return [generator, finalizer];
}

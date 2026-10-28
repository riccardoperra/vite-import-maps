import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { viteImportMaps } from "../../src/index.js";
import {
  expectImportMapMatchesOutputs,
  findAssetByFileName,
  findChunkByFileName,
  getViteBuildTool,
  parseImportMapFromHtml,
} from "./build.test-utils.js";
import type { VitePluginImportMapsConfig } from "../../src/config.js";
import type { RolldownOutput } from "rolldown";
import type { InlineConfig } from "vite";

const root = path.join(import.meta.dirname, "fixture", "basic");
const temporaryDirectories: Array<string> = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function buildAliases(
  version: 6 | 7 | 8,
  imports: VitePluginImportMapsConfig["imports"],
) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "import-map-aliases-"));
  temporaryDirectories.push(outDir);
  const build = await getViteBuildTool(version);
  const outputOptions = {
    input: path.join(root, "index.html"),
    output: {
      entryFileNames: "[name].mjs",
      chunkFileNames: "[name].mjs",
    },
  };
  const config: InlineConfig = {
    configFile: false,
    root,
    logLevel: "silent",
    resolve: {
      alias: {
        "source-esm": path.join(root, "shared-lib.ts"),
      },
    },
    plugins: [viteImportMaps({ imports, modulesOutDir: "shared" })],
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      ...(version < 8
        ? { rollupOptions: outputOptions }
        : { rolldownOptions: outputOptions }),
    },
  };
  // Vite versions expose incompatible plugin types, but accept this config.
  const result = (await build(config as never)) as RolldownOutput;
  const importMap = parseImportMapFromHtml(
    findAssetByFileName(result, "index.html"),
  );
  expectImportMapMatchesOutputs(result, importMap);
  return { outDir, result, importMap, config };
}

describe.each([8, 7, 6] as const)("aliases with Vite %s", (version) => {
  test("exposes the configured ESM entry under a different public name", async () => {
    const { outDir, result, importMap } = await buildAliases(version, [
      { name: "public-esm", entry: "source-esm" },
    ]);
    expect(importMap.imports).toEqual({
      "public-esm": "./shared/public-esm.mjs",
    });
    const chunk = findChunkByFileName(result, "shared/public-esm.mjs");
    expect(chunk.isEntry).toBe(false);
    const builtModule = await import(
      pathToFileURL(path.join(outDir, chunk.fileName)).href
    );
    expect(builtModule.default.foo()).toBe("test");
    expect(builtModule.foo()).toBe("test");
    expect(builtModule.bar).toBe("bar");
  });

  test("preserves CommonJS default exports through package aliases", async () => {
    const { outDir, importMap } = await buildAliases(version, [
      { name: "public-classnames", entry: "classnames" },
    ]);
    expect(importMap.imports).toEqual({
      "public-classnames": "./shared/public-classnames.mjs",
    });
    const builtModule = await import(
      pathToFileURL(path.join(outDir, importMap.imports["public-classnames"]))
        .href
    );
    expect(builtModule.default("one", { two: true, three: false })).toBe(
      "one two",
    );
  });

  test("keeps multiple local aliases and their individual integrity settings", async () => {
    const { outDir, result, importMap } = await buildAliases(version, [
      { name: "first", entry: "./shared-lib.ts", integrity: "sha256" },
      { name: "second", entry: "./shared-lib.ts", integrity: "sha512" },
      { name: "third", entry: "./shared-lib.ts", integrity: false },
    ]);
    expect(importMap.imports).toEqual({
      first: "./shared/first.mjs",
      second: "./shared/second.mjs",
      third: "./shared/third.mjs",
    });
    const expectedIntegrity: Record<string, string> = {};
    for (const [name, algorithm] of [
      ["first", "sha256"],
      ["second", "sha512"],
      ["third", false],
    ] as const) {
      const url = importMap.imports[name];
      const chunk = findChunkByFileName(result, url.slice(2));
      expect(chunk.isEntry).toBe(false);
      if (algorithm) {
        expectedIntegrity[url] = `${algorithm}-${createHash(algorithm)
          .update(chunk.code)
          .digest("base64")}`;
      }
      const builtModule = await import(
        pathToFileURL(path.join(outDir, chunk.fileName)).href
      );
      expect(builtModule.default.foo()).toBe("test");
      expect(builtModule.foo()).toBe("test");
      expect(builtModule.bar).toBe("bar");
    }
    expect(importMap.integrity).toEqual(expectedIntegrity);
  });

  test("emits all aliases when the plugin instance is reused for another build", async () => {
    const { config, importMap } = await buildAliases(version, [
      { name: "first", entry: "./shared-lib.ts" },
      { name: "second", entry: "./shared-lib.ts" },
      { name: "public-esm", entry: "source-esm" },
    ]);
    const build = await getViteBuildTool(version);
    const result = (await build(config as never)) as RolldownOutput;
    expect(Object.keys(importMap.imports).sort()).toEqual([
      "first",
      "public-esm",
      "second",
    ]);
    expectImportMapMatchesOutputs(result, importMap);
  });
});

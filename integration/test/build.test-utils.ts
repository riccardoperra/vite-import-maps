import path from "node:path";
import { expect } from "vitest";
import { createJiti } from "jiti";
import type { UserConfig } from "vite";
import type { OutputAsset, OutputChunk, RolldownOutput } from "rolldown";

export interface ImportMap {
  imports: Record<string, string>;
  integrity?: Record<string, string>;
}

interface BuiltFixture {
  buildOutput: string;
  result: RolldownOutput;
}

interface SharedChunkAssertionOptions {
  result: RolldownOutput;
  buildOutput: string;
  name: string;
  fileName: string;
  expectNonEmptyCode?: boolean;
}

export function findChunkByName(
  result: RolldownOutput,
  name: string,
): OutputChunk {
  const chunk = result.output.find(
    (output): output is OutputChunk =>
      output.type === "chunk" && output.name === name,
  );

  expect(chunk, `Expected emitted chunk \`${name}\` to exist`).toBeDefined();

  return chunk!;
}

export function findChunkByFileName(
  result: RolldownOutput,
  fileName: string,
): OutputChunk {
  const chunk = result.output.find(
    (output): output is OutputChunk =>
      output.type === "chunk" && output.fileName === fileName,
  );

  expect(
    chunk,
    `Expected emitted chunk file \`${fileName}\` to exist`,
  ).toBeDefined();

  return chunk!;
}

export function findAssetByFileName(
  result: RolldownOutput,
  fileName: string,
): OutputAsset {
  const asset = result.output.find(
    (output): output is OutputAsset =>
      output.type === "asset" && output.fileName === fileName,
  );

  expect(
    asset,
    `Expected emitted asset \`${fileName}\` to exist`,
  ).toBeDefined();

  return asset!;
}

type SupportedViteVersion = 6 | 7 | 8;

export async function getViteBuildTool(version: SupportedViteVersion) {
  const map = {
    [6]: import("vite@6"),
    [7]: import("vite@7"),
    [8]: import("vite@8"),
  };
  const vite = await map[version];
  return vite.build;
}

const jiti = createJiti(import.meta.url, {
  moduleCache: false,
  fsCache: false,
  debug: true,
});

export async function buildFixture(
  configPath: string,
  version: 6 | 7 | 8,
): Promise<BuiltFixture> {
  const configUrl = new URL(configPath, import.meta.url);
  // Load fixture config as a fresh module to avoid sharing plugin state
  // between Vite 7 and Vite 8 runs in the same test process.
  configUrl.searchParams.set(
    "fixture",
    `${version}-${Date.now()}-${Math.random()}`,
  );

  const { default: config } = await jiti.import<{ default: UserConfig }>(
    configUrl.href,
  );

  expect(config.build?.outDir).toBeDefined();

  const build = await getViteBuildTool(version);

  // @ts-expect-error Type collision
  const { rolldownOptions, outDir, ...configDotBuild } = config.build;
  const versionedOutDir = path.join(outDir, `vite${version}`);

  const viteBuildConfig = {
    ...config,
    build: {
      emitAssets: true,
      emptyOutDir: true,
      ...configDotBuild,
      ...(version < 8
        ? { rollupOptions: rolldownOptions }
        : {
            rolldownOptions,
          }),
      outDir: versionedOutDir,
    },
  } satisfies UserConfig;

  // @ts-expect-error Type collision
  const output = await build(viteBuildConfig);

  return {
    buildOutput: versionedOutDir,
    result: output as RolldownOutput,
  };
}

export function parseImportMapFromHtml(indexHtml: OutputAsset): ImportMap {
  const source = String(indexHtml.source);
  const scriptMatch = source.match(
    /<script type="importmap">([\s\S]*?)<\/script>/,
  );

  expect(
    scriptMatch,
    "Expected HTML to include an import map script",
  ).toBeTruthy();

  return JSON.parse(scriptMatch![1]) as ImportMap;
}

export function expectImportMapMatchesOutputs(
  result: RolldownOutput,
  expectedImportMap: ImportMap,
  options?: { importMapAssetFileName?: string },
): void {
  const indexHtml = findAssetByFileName(result, "index.html");

  expect(parseImportMapFromHtml(indexHtml)).toEqual(expectedImportMap);

  if (options?.importMapAssetFileName) {
    const importMapAsset = findAssetByFileName(
      result,
      options.importMapAssetFileName,
    );
    expect(JSON.parse(String(importMapAsset.source)) as ImportMap).toEqual(
      expectedImportMap,
    );
  }

  for (const [packageName, url] of Object.entries(expectedImportMap.imports)) {
    expect(
      url,
      `Expected import map URL for \`${packageName}\` to be relative`,
    ).toMatch(/^\.\//);

    const mappedChunk = findChunkByFileName(result, url.slice(2));

    expect(mappedChunk.fileName).toEqual(url.slice(2));
  }

  if (expectedImportMap.integrity) {
    for (const [url] of Object.entries(expectedImportMap.integrity)) {
      expect(Object.values(expectedImportMap.imports)).toContain(url);
      expect(findChunkByFileName(result, url.slice(2)).fileName).toEqual(
        url.slice(2),
      );
    }
  }
}

export async function expectSharedChunk({
  result,
  buildOutput,
  name,
  fileName,
  expectNonEmptyCode = true,
}: SharedChunkAssertionOptions): Promise<OutputChunk> {
  const chunk = findChunkByName(result, name);

  expect(chunk.isEntry).toEqual(false);
  expect(chunk.fileName).toEqual(fileName);

  if (expectNonEmptyCode) {
    expect(chunk.code.trim().length).toBeGreaterThan(0);
  }

  await expect(chunk.code).toMatchFileSnapshot(
    path.join(buildOutput, chunk.fileName),
  );

  return chunk;
}

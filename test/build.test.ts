import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { build } from "vite";
import type { OutputAsset, RolldownOutput } from "rolldown";

const cryptoMockState = vi.hoisted(() => ({
  digest: undefined as string | undefined,
}));

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();

  return {
    ...original,
    createHash: vi.fn((algorithm: string) => {
      if (!cryptoMockState.digest) {
        return original.createHash(algorithm);
      }

      const hash = {
        update: vi.fn(() => hash),
        digest: vi.fn(() => cryptoMockState.digest),
      };

      return hash as ReturnType<typeof original.createHash>;
    }),
  };
});

afterEach(() => {
  cryptoMockState.digest = undefined;
  vi.clearAllMocks();
});

test("build project with right import map", async () => {
  const { default: config } =
    await import("./fixture/basic/vite.config-test.js");
  const buildOutput = config.build.outDir;

  const result = (await build(config)) as RolldownOutput;

  expect(result.output).toHaveLength(2);
  const [sharedDependency, indexHtml] = result.output;

  expect(sharedDependency.type).toEqual("chunk");
  expect(sharedDependency.name).toEqual("@import-maps/shared-lib");
  expect(sharedDependency.isEntry).toEqual(false);
  expect(sharedDependency.fileName).toSatisfy((name) =>
    name.startsWith("assets/@import-maps/shared-lib-"),
  );
  await expect(sharedDependency.code).toMatchFileSnapshot(
    path.join(buildOutput, sharedDependency.fileName),
  );
  const expectedImportMap = JSON.stringify({
    imports: {
      "shared-lib": `./${sharedDependency.fileName}`,
    },
  });
  expect(indexHtml.type).toEqual("asset");
  expect((indexHtml as OutputAsset).source).toContain(
    `<script type="importmap">${expectedImportMap}</script>`,
  );
});

test("include integrity in import maps when enabled", async () => {
  cryptoMockState.digest = "abc123";
  const { default: config } =
    await import("./fixture/with-integrity/vite.config-test.js");
  const buildOutput = config.build.outDir;

  const result = (await build(config)) as RolldownOutput;

  expect(result.output).toHaveLength(2);
  const [sharedDependency, indexHtml] = result.output;

  expect(sharedDependency.type).toEqual("chunk");
  expect(sharedDependency.name).toEqual("@import-maps/shared-lib");
  expect(sharedDependency.isEntry).toEqual(false);
  expect(sharedDependency.fileName).toSatisfy((name) =>
    name.startsWith("assets/@import-maps/shared-lib-"),
  );
  await expect(sharedDependency.code).toMatchFileSnapshot(
    path.join(buildOutput, sharedDependency.fileName),
  );
  const expectedImportMap = JSON.stringify({
    imports: {
      "shared-lib": `./${sharedDependency.fileName}`,
    },
    integrity: {
      [`./${sharedDependency.fileName}`]: "sha384-abc123",
    },
  });
  expect(indexHtml.type).toEqual("asset");
  expect((indexHtml as OutputAsset).source).toContain(
    `<script type="importmap">${expectedImportMap}</script>`,
  );
});

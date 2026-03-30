import path from "node:path";
import { expect, test, vi } from "vitest";
import { build } from "vite";
import type { OutputAsset, RolldownOutput } from "rolldown";

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
  const { default: config } =
    await import("./fixture/with-integrity/vite.config-test.js");
  const buildOutput = config.build.outDir;
  vi.mock(import("node:crypto"), async (importOriginal) => ({
    ...(await importOriginal()),
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => "abc123"),
      })),
    })) as any,
  }));

  const result = (await build(config)) as RollupOutput;

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

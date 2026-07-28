import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildFixture,
  expectImportMapMatchesOutputs,
  expectSharedChunk,
  findAssetByFileName,
  findChunkByName,
  parseImportMapFromHtml,
} from "./build.test-utils.js";
import type { ImportMap } from "./build.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  ["vite8", 8],
  ["vite7", 7],
  ["vite6", 6],
] as const)("%s", (_, version) => {
  test("build project with right import map", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/basic/vite.config-test.js",
      version,
    );
    const sharedDependency = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/shared-lib",
      fileName: "@import-maps/shared-lib.js",
    });

    const builtChunk = await import(
      pathToFileURL(path.join(buildOutput, sharedDependency.fileName)).href
    );
    expect(builtChunk.default.foo()).toEqual("test");
    expect(builtChunk.bar).toEqual("bar");

    const expectedImportMap: ImportMap = {
      imports: {
        "shared-lib": `./${sharedDependency.fileName}`,
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap);
  });

  test("preserve aliases that resolve to the same local entry", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/local-entry/vite.config-test.js",
      version,
    );
    const sharedDependency = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/local-shared-lib",
      fileName: "@import-maps/local-shared-lib.js",
    });

    const expectedImportMap: ImportMap = {
      imports: {
        "local-shared-lib": `./${sharedDependency.fileName}`,
        "local-shared-lib-alias": `./${sharedDependency.fileName}`,
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap);
  });

  test("include integrity in import maps when enabled", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/with-integrity/vite.config-test.js",
      version,
    );
    const sharedDependency = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/shared-lib",
      fileName: "@import-maps/shared-lib.js",
    });
    const expectedIntegrity = `sha384-${crypto
      .createHash("sha384")
      .update(sharedDependency.code)
      .digest("base64")}`;

    const expectedImportMap: ImportMap = {
      imports: {
        "shared-lib": `./${sharedDependency.fileName}`,
      },
      integrity: {
        [`./${sharedDependency.fileName}`]: expectedIntegrity,
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap);
  });

  // https://github.com/riccardoperra/vite-import-maps/issues/29
  test("GH-29 hashes final dynamic-import chunk contents", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/gh-29-with-dynamic-import-integrity/vite.config-test.js",
      version,
    );
    const sharedDependency = findChunkByName(result, "@import-maps/shared-lib");
    const htmlAsset = findAssetByFileName(result, "index.html");
    const importMapAsset = findAssetByFileName(result, "import-map.json");
    const htmlSource = await readFile(
      path.join(buildOutput, htmlAsset.fileName),
      "utf8",
    );
    const importMapSource = await readFile(
      path.join(buildOutput, importMapAsset.fileName),
      "utf8",
    );
    const htmlImportMap = parseImportMapFromHtml(htmlAsset);
    const fileImportMap = JSON.parse(importMapSource) as ImportMap;
    const sharedDependencyUrl = `./${sharedDependency.fileName}`;
    const emittedContents = await readFile(
      path.join(buildOutput, sharedDependencyUrl.slice(2)),
    );
    const expectedIntegrity = `sha384-${crypto
      .createHash("sha384")
      .update(emittedContents)
      .digest("base64")}`;

    expect(String(htmlAsset.source)).toBe(htmlSource);
    expect(String(importMapAsset.source)).toBe(importMapSource);
    expect(htmlSource).not.toContain("__vite_import_maps_placeholder__");
    expect(importMapSource).not.toContain("__vite_import_maps_placeholder__");
    expect(htmlSource).not.toContain("data-vite-import-maps");
    expect(importMapSource).not.toContain("data-vite-import-maps");
    expect(htmlSource).not.toContain("vite-import-maps-");
    expect(importMapSource).not.toContain("vite-import-maps-");
    expect(String(emittedContents)).toContain("__vite__mapDeps");
    expect(String(emittedContents)).not.toContain("__VITE_PRELOAD__");
    expect(htmlImportMap).toEqual({
      imports: {
        "shared-lib": sharedDependencyUrl,
      },
      integrity: {
        [sharedDependencyUrl]: expectedIntegrity,
      },
    });
    expect(fileImportMap).toEqual(htmlImportMap);
  });

  test("GH-29 hashes final in-memory dynamic-import chunk contents", async () => {
    const { result } = await buildFixture(
      "./fixture/gh-29-with-dynamic-import-integrity/vite.config-test.js",
      version,
      { write: false },
    );
    const sharedDependency = findChunkByName(result, "@import-maps/shared-lib");
    const htmlAsset = findAssetByFileName(result, "index.html");
    const importMapAsset = findAssetByFileName(result, "import-map.json");
    const htmlSource = String(htmlAsset.source);
    const importMapSource = String(importMapAsset.source);
    const htmlImportMap = parseImportMapFromHtml(htmlAsset);
    const fileImportMap = JSON.parse(importMapSource) as ImportMap;
    const sharedDependencyUrl = `./${sharedDependency.fileName}`;
    const expectedIntegrity = `sha384-${crypto
      .createHash("sha384")
      .update(sharedDependency.code)
      .digest("base64")}`;

    expect(htmlSource).not.toContain("__vite_import_maps_placeholder__");
    expect(importMapSource).not.toContain("__vite_import_maps_placeholder__");
    expect(htmlSource).not.toContain("data-vite-import-maps");
    expect(importMapSource).not.toContain("data-vite-import-maps");
    expect(htmlSource).not.toContain("vite-import-maps-");
    expect(importMapSource).not.toContain("vite-import-maps-");
    expect(sharedDependency.code).toContain("__vite__mapDeps");
    expect(sharedDependency.code).not.toContain("__VITE_PRELOAD__");
    expect(htmlImportMap).toEqual({
      imports: {
        "shared-lib": sharedDependencyUrl,
      },
      integrity: {
        [sharedDependencyUrl]: expectedIntegrity,
      },
    });
    expect(fileImportMap).toEqual(htmlImportMap);
  });

  test.skipIf(version < 8)(
    "preserve default exports for commonjs shared dependencies",
    async () => {
      const { buildOutput, result } = await buildFixture(
        "./fixture/with-commonjs-default/vite.config-test.js",
        version,
      );
      const sharedDependency = await expectSharedChunk({
        result,
        buildOutput,
        name: "@import-maps/shared-lib",
        fileName: "@import-maps/shared-lib.js",
      });

      const builtChunk = await import(
        pathToFileURL(path.join(buildOutput, sharedDependency.fileName)).href
      );

      expect(builtChunk.default("World")).toEqual("Hello World");
      expect(builtChunk.foo("World")).toEqual("Hello World");

      const expectedImportMap: ImportMap = {
        imports: {
          "shared-lib": `./${sharedDependency.fileName}`,
        },
      };

      expectImportMapMatchesOutputs(result, expectedImportMap);
    },
  );

  test("imports commonjs modules that uses browser globals", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/with-cjs-that-use-browser-globals/vite.config-test.js",
      version,
    );
    const sharedDependency = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/shared-lib",
      fileName: "@import-maps/shared-lib.js",
    });

    const expectedImportMap: ImportMap = {
      imports: {
        "shared-lib": `./${sharedDependency.fileName}`,
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap);
  });

  // https://github.com/riccardoperra/vite-import-maps/issues/18
  test("GH-18 imports commonjs classnames", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/with-cjs-classnames/vite.config-test.js",
      version,
    );

    await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/classnames",
      fileName: "@import-maps/classnames.js",
    });

    const expectedImportMap: ImportMap = {
      imports: {
        classnames: `./@import-maps/classnames.js`,
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap);
  });

  // https://github.com/riccardoperra/vite-import-maps/issues/18
  test("GH-16 imports wasm", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/gh-16-with-shiki-onig-wasm/vite.config-test.js",
      version,
    );

    await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/shiki-wasm-init",
      fileName: "@import-maps/shiki-wasm-init.js",
    });

    await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/shiki-wasm-url",
      fileName: "@import-maps/shiki-wasm-url.js",
    });

    const expectedImportMap: ImportMap = {
      imports: {
        "shiki-wasm-init": "./@import-maps/shiki-wasm-init.js",
        "shiki-wasm-url": "./@import-maps/shiki-wasm-url.js",
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap);
  });

  test("build react fixture with stable import map output", async () => {
    const { buildOutput, result } = await buildFixture(
      "./fixture/react-basic/vite.config-test.js",
      version,
    );
    const sharedReactChunk = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/react",
      fileName: "@import-maps/react.js",
    });
    const sharedReactDomChunk = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/react-dom",
      fileName: "@import-maps/react-dom.js",
    });
    const sharedReactJsxRuntimeChunk = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/react_jsx-runtime",
      fileName: "@import-maps/react_jsx-runtime.js",
    });
    const sharedReactI18NextChunk = await expectSharedChunk({
      result,
      buildOutput,
      name: "@import-maps/react-i18next",
      fileName: "@import-maps/react-i18next.js",
    });

    const expectedImportMap: ImportMap = {
      imports: {
        "react-dom": `./${sharedReactDomChunk.fileName}`,
        react: `./${sharedReactChunk.fileName}`,
        "react/jsx-runtime": `./${sharedReactJsxRuntimeChunk.fileName}`,
        "react-i18next": `./${sharedReactI18NextChunk.fileName}`,
      },
    };

    expectImportMapMatchesOutputs(result, expectedImportMap, {
      importMapAssetFileName: "import-map.json",
    });
  });
});

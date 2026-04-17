import path from "node:path";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildFixture,
  expectImportMapMatchesOutputs,
  expectSharedChunk,
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

    const expectedImportMap: ImportMap = {
      imports: {
        "shared-lib": `./${sharedDependency.fileName}`,
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

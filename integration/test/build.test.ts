import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, expect, test, vi } from "vitest";
import {
  buildFixture,
  expectImportMapMatchesOutputs,
  expectSharedChunk,
} from "./build.test-utils.js";
import type { ImportMap } from "./build.test-utils.js";

const cryptoMockState = vi.hoisted(() => ({
  digest: undefined as string | undefined,
}));

vi.mock(import("node:crypto"), async (importOriginal) => {
  const original = await importOriginal();

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

      return hash as unknown as ReturnType<typeof original.createHash>;
    }),
  };
});

afterEach(() => {
  cryptoMockState.digest = undefined;
  vi.clearAllMocks();
});

test("build project with right import map", async () => {
  const { buildOutput, result } = await buildFixture(
    "./fixture/basic/vite.config-test.js",
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
  cryptoMockState.digest = "abc123";
  const { buildOutput, result } = await buildFixture(
    "./fixture/with-integrity/vite.config-test.js",
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
    integrity: {
      [`./${sharedDependency.fileName}`]: "sha384-abc123",
    },
  };

  expectImportMapMatchesOutputs(result, expectedImportMap);
});

test("preserve default exports for commonjs shared dependencies", async () => {
  const { buildOutput, result } = await buildFixture(
    "./fixture/with-commonjs-default/vite.config-test.js",
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
});

test("imports commonjs modules that uses browser globals", async () => {
  const { buildOutput, result } = await buildFixture(
    "./fixture/with-cjs-that-use-browser-globals/vite.config-test.js",
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

test("build react fixture with stable import map output", async () => {
  const { buildOutput, result } = await buildFixture(
    "./fixture/react-basic/vite.config-test.js",
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

  const expectedImportMap: ImportMap = {
    imports: {
      "react-dom": `./${sharedReactDomChunk.fileName}`,
      react: `./${sharedReactChunk.fileName}`,
      "react/jsx-runtime": `./${sharedReactJsxRuntimeChunk.fileName}`,
    },
  };

  expectImportMapMatchesOutputs(result, expectedImportMap, {
    importMapAssetFileName: "import-map.json",
  });
});

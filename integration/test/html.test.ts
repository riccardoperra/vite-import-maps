import path from "node:path";
import { describe, expect, test } from "vitest";
import { viteImportMaps } from "../../src/index.js";
import { findAssetByFileName, getViteBuildTool } from "./build.test-utils.js";
import type { ImportMapSignature } from "../../src/index.js";
import type { RolldownOutput } from "rolldown";
import type { InlineConfig } from "vite";

const closingTagUrl = './</script><script id="injected">alert(1)</script>.js';
const specialImports = {
  closingTag: closingTagUrl,
  mixedCase: "./</ScRiPt>.js",
  comment: "./<!--comment-->.js",
  quoted: "./it's-quoted-\".js",
  replacementTokens: "./$&-$`-$'.js",
  separators: "./line\u2028paragraph\u2029.js",
  ["__proto__"]: "./prototype.js",
};

function withSpecialValues(importMap: ImportMapSignature): ImportMapSignature {
  return {
    ...importMap,
    imports: { ...importMap.imports, ...specialImports },
    scopes: {
      "/nested/": { ...specialImports },
      ["__proto__"]: { nested: closingTagUrl },
    },
  };
}

test("virtual exports preserve special keys and provide JSON safe for inline scripts", async () => {
  const plugins = viteImportMaps({
    imports: [],
    importMapHtmlTransformer: withSpecialValues,
  });
  const plugin = plugins.find(
    (candidate) =>
      candidate.name === "vite-import-maps:virtual-module-import-map",
  );
  if (
    typeof plugin?.resolveId !== "function" ||
    typeof plugin.load !== "function"
  ) {
    throw new TypeError("Expected virtual-module resolution and loading hooks");
  }

  // @ts-expect-error Direct hook invocation for isolated plugin testing.
  const id = await plugin.resolveId.call({}, "virtual:importmap");
  // @ts-expect-error Direct hook invocation for isolated plugin testing.
  const code = await plugin.load.call({}, id);
  expect(typeof code).toBe("string");

  const module = await import(
    `data:text/javascript,${encodeURIComponent(String(code))}`
  );
  expect(module.default).toBe(module.importMap);
  expect(module.importMap).toEqual(withSpecialValues({ imports: {} }));
  expect(JSON.parse(module.importMapRaw)).toEqual(module.importMap);
  expect(module.importMapRaw).not.toMatch(/[<\u2028\u2029]/);
  expect(Object.hasOwn(module.importMap.imports, "__proto__")).toBe(true);
  expect(module.importMap.imports["__proto__"]).toBe("./prototype.js");
  expect(Object.hasOwn(module.importMap.scopes, "__proto__")).toBe(true);
  expect(module.importMap.scopes["__proto__"]).toEqual({
    nested: closingTagUrl,
  });
  expect(Object.getPrototypeOf(module.importMap.scopes)).toBe(Object.prototype);
});

describe.each([6, 7, 8] as const)("Vite %i HTML output", (version) => {
  test("keeps script attributes and safely serializes the same map as JSON output", async () => {
    const root = path.resolve(import.meta.dirname, "fixture/basic");
    const build = await getViteBuildTool(version);
    // Extra runtime properties must not override the required script type.
    const attributes = {
      nonce: "build-nonce",
      id: "shared-import-map",
      "data-owner": 'host "app"',
      "data-environment": "production",
      type: "module",
    };
    const outputOptions = {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
      },
    };
    const config = {
      configFile: false,
      root,
      logLevel: "silent",
      plugins: [
        viteImportMaps({
          imports: [{ name: "shared-lib", entry: "./shared-lib.ts" }],
          modulesOutDir: "@import-maps",
          outputAsFile: true,
          importMapScriptAttributes: attributes,
          importMapHtmlTransformer: withSpecialValues,
        }),
      ],
      build: {
        write: false,
        minify: false,
        ...(version < 8
          ? { rollupOptions: outputOptions }
          : { rolldownOptions: outputOptions }),
      },
    } satisfies InlineConfig;

    // @ts-expect-error Plugin types differ across the supported Vite versions.
    const result = (await build(config)) as RolldownOutput;
    const html = String(findAssetByFileName(result, "index.html").source);
    const scripts = Array.from(
      html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
    );
    expect(scripts).toHaveLength(1);
    const [, emittedAttributes, scriptContent] = scripts[0];

    expect(emittedAttributes).toContain('type="importmap"');
    expect(emittedAttributes).not.toContain('type="module"');
    expect(emittedAttributes).toContain('nonce="build-nonce"');
    expect(emittedAttributes).toContain('id="shared-import-map"');
    expect(emittedAttributes).toContain('data-owner="host &quot;app&quot;"');
    expect(emittedAttributes).toContain('data-environment="production"');
    expect(scriptContent).not.toMatch(/[<\u2028\u2029]/);
    expect(html).not.toContain('<script id="injected">');

    const expectedMap = withSpecialValues({
      imports: { "shared-lib": "./@import-maps/shared-lib.js" },
    });
    const parsedHtmlMap = JSON.parse(scriptContent);
    expect(parsedHtmlMap).toEqual(expectedMap);
    expect(Object.hasOwn(parsedHtmlMap.imports, "__proto__")).toBe(true);
    expect(Object.hasOwn(parsedHtmlMap.scopes, "__proto__")).toBe(true);
    const json = String(findAssetByFileName(result, "import-map.json").source);
    expect(JSON.parse(json)).toEqual(expectedMap);
  });
});

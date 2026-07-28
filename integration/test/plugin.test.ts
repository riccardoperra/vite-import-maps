import { describe, expect, test, vi } from "vitest";
import { viteImportMaps } from "../../src/index.js";
import type { Plugin } from "vite";

function findPlugin(plugins: Array<Plugin>, name: string): Plugin {
  const plugin = plugins.find((candidate) => candidate.name === name);
  expect(plugin, `Expected plugin ${name}`).toBeDefined();
  return plugin!;
}

async function loadVirtualImportMap(plugin: Plugin) {
  if (typeof plugin.resolveId !== "function") {
    throw new TypeError("Expected a resolveId hook");
  }
  if (typeof plugin.load !== "function") {
    throw new TypeError("Expected a load hook");
  }

  // @ts-expect-error Direct hook invocation for isolated plugin testing.
  const resolvedId = await plugin.resolveId.call({}, "virtual:importmap");
  // @ts-expect-error Direct hook invocation for isolated plugin testing.
  return plugin.load.call({}, resolvedId);
}

describe("virtual:importmap", () => {
  test("safely serializes raw import maps", async () => {
    const plugins = viteImportMaps({
      imports: [],
      importMapHtmlTransformer: () => ({
        imports: {
          quoted: "./it's-valid.js",
          multiline: "./line\nbreak.js",
          unicode: "./separator\u2028.js",
        },
      }),
    });
    const plugin = findPlugin(
      plugins,
      "vite-import-maps:virtual-module-import-map",
    );
    const code = await loadVirtualImportMap(plugin);

    expect(typeof code).toBe("string");
    const module = await import(
      `data:text/javascript,${encodeURIComponent(String(code))}`
    );

    expect(module.default).toEqual({
      imports: {
        quoted: "./it's-valid.js",
        multiline: "./line\nbreak.js",
        unicode: "./separator\u2028.js",
      },
    });
    expect(JSON.parse(module.importMapRaw)).toEqual(module.default);
  });
});

describe("development import maps", () => {
  test("falls back with a warning when the dependency optimizer is unavailable", async () => {
    const plugins = viteImportMaps({
      imports: ["shared-lib"],
      integrity: "sha384",
    });
    const developmentPlugin = findPlugin(
      plugins,
      "vite-import-maps:development",
    );
    const htmlPlugin = findPlugin(
      plugins,
      "vite-import-maps:inject-html-import-map",
    );
    const virtualModulePlugin = findPlugin(
      plugins,
      "vite-import-maps:virtual-module-import-map",
    );
    const resolveId = vi.fn(() => ({
      id: "/project/node_modules/shared-lib/index.js",
    }));
    const warn = vi.fn();
    const server = {
      pluginContainer: { resolveId },
      config: {
        root: "/project",
        logger: { warn },
      },
      environments: {
        client: {},
      },
    };

    if (typeof developmentPlugin.transformIndexHtml !== "function") {
      throw new TypeError("Expected a transformIndexHtml hook");
    }

    for (let index = 0; index < 2; index++) {
      // @ts-expect-error Minimal dev-server mock for isolated plugin testing.
      await developmentPlugin.transformIndexHtml.call({}, "", { server });
    }

    if (typeof htmlPlugin.transformIndexHtml !== "function") {
      throw new TypeError("Expected a transformIndexHtml hook");
    }

    // @ts-expect-error Minimal dev-server mock for isolated plugin testing.
    const transformedHtml = await htmlPlugin.transformIndexHtml.call({}, "", {
      server,
    });

    expect(warn).toHaveBeenCalledOnce();
    expect(resolveId).toHaveBeenCalledTimes(2);
    expect(transformedHtml).toEqual({
      html: "",
      tags: [
        {
          tag: "script",
          attrs: { type: "importmap" },
          children:
            '{"imports":{"shared-lib":"/node_modules/shared-lib/index.js"}}',
          injectTo: "head-prepend",
        },
      ],
    });

    const code = await loadVirtualImportMap(virtualModulePlugin);
    const module = await import(
      `data:text/javascript,${encodeURIComponent(String(code))}`
    );
    expect(module.default).toEqual({
      imports: {
        "shared-lib": "/node_modules/shared-lib/index.js",
      },
    });
  });
});

describe("dependency identifiers", () => {
  test("adds an incremental suffix only when normalized names collide", async () => {
    const plugins = viteImportMaps({ imports: ["foo/bar", "foo_bar"] });
    const resolver = findPlugin(
      plugins,
      "vite-import-maps:build:virtual-chunks-loader",
    );

    if (typeof resolver.resolveId !== "function") {
      throw new TypeError("Expected a resolveId hook");
    }

    // @ts-expect-error Direct hook invocation for isolated plugin testing.
    const first = await resolver.resolveId.call(
      { environment: { name: "client" } },
      "\0virtual:import-map-chunk/foo_bar",
    );
    // @ts-expect-error Direct hook invocation for isolated plugin testing.
    const second = await resolver.resolveId.call(
      { environment: { name: "client" } },
      "\0virtual:import-map-chunk/foo_bar_1",
    );

    expect(first).toBeDefined();
    expect(second).toBeDefined();
  });

  test("rejects duplicate public specifiers", () => {
    expect(() => viteImportMaps({ imports: ["react", "react"] })).toThrow(
      "Duplicate import-map dependency: react",
    );
  });
});

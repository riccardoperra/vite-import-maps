import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { viteImportMaps } from "../../src/index.js";
import type {
  ImportMapSignature,
  VitePluginImportMapsConfig,
} from "../../src/config.js";
import type { ViteDevServer } from "vite";

const servers: Array<ViteDevServer> = [];
const cacheDirectories: Array<string> = [];
const root = path.resolve(import.meta.dirname, "fixture/local-entry");

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(
    cacheDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function startServer(
  version: 6 | 7 | 8,
  options: VitePluginImportMapsConfig,
  optimize: boolean,
): Promise<{ server: ViteDevServer; origin: string }> {
  const vite = await {
    6: () => import("vite@6"),
    7: () => import("vite@7"),
    8: () => import("vite@8"),
  }[version]();
  const cacheDir = await mkdtemp(path.join(tmpdir(), "vite-import-map-dev-"));
  cacheDirectories.push(cacheDir);
  // Vite versions have separate plugin types, but share these runtime hooks.
  const server = (await vite.createServer({
    root,
    configFile: false,
    base: "/app/",
    cacheDir,
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true, include: optimize ? ["react"] : [] },
    server: { host: "127.0.0.1", port: 0 },
    plugins: viteImportMaps(options),
  } as never)) as ViteDevServer;
  servers.push(server);
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected an HTTP server address");
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

function createOptions(): VitePluginImportMapsConfig {
  return {
    imports: ["react", { name: "local-shared-lib", entry: "./shared-lib.ts" }],
    outputAsFile: "runtime-map",
    importMapHtmlTransformer: (importMap) => ({
      ...importMap,
      scopes: { "/remote/": { api: "/api.js" } },
    }),
  };
}

function parseHtmlMap(html: string): ImportMapSignature {
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  expect(match).not.toBeNull();
  return JSON.parse(match![1]);
}

describe.each([6, 7, 8] as const)("Vite %s development", (version) => {
  test("serves a complete JSON map before HTML and honors base and query strings", async () => {
    const { server, origin } = await startServer(
      version,
      createOptions(),
      true,
    );
    const response = await fetch(`${origin}/app/runtime-map.json?fresh=1`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const map = (await response.json()) as ImportMapSignature;
    expect(map.imports?.["local-shared-lib"]).toBe("/app/shared-lib.ts");
    expect(map.imports?.react).toMatch(/^\/app\/.*react.*\.js\?v=/);
    expect(map.scopes).toEqual({ "/remote/": { api: "/api.js" } });

    // Verify emitted URLs are actual Vite module endpoints, including /@fs/.
    for (const url of Object.values(map.imports!)) {
      expect((await fetch(`${origin}${url}`)).status).toBe(200);
    }
    const html = await fetch(`${origin}/app/`).then((result) => result.text());
    const currentMap = await fetch(`${origin}/app/runtime-map.json`).then(
      (result) => result.json(),
    );
    expect(parseHtmlMap(html)).toEqual(currentMap);
    const module = await server.ssrLoadModule("virtual:importmap");
    expect(module.default).toEqual(currentMap);
    expect(JSON.parse(module.importMapRaw)).toEqual(currentMap);
  });

  test.each([true, false])(
    "resolves the virtual map before HTML in SSR (optimizer: %s)",
    async (optimize) => {
      const { server, origin } = await startServer(
        version,
        createOptions(),
        optimize,
      );
      const module = await server.ssrLoadModule("virtual:importmap");
      expect(module.default.imports["local-shared-lib"]).toBe(
        "/app/shared-lib.ts",
      );
      expect(module.default.imports.react).toMatch(/^\/app\//);
      expect(Object.keys(module.default.imports)).toEqual([
        "react",
        "local-shared-lib",
      ]);
      const json = await fetch(`${origin}/app/runtime-map.json`).then(
        (result) => result.json(),
      );
      const html = await fetch(`${origin}/app/`).then((result) =>
        result.text(),
      );
      expect(module.default).toEqual(json);
      expect(JSON.parse(module.importMapRaw)).toEqual(json);
      expect(parseHtmlMap(html)).toEqual(json);
    },
  );
});

test("reports the specifier, entry, and root for unresolved development dependencies", async () => {
  const { server, origin } = await startServer(
    8,
    {
      imports: [{ name: "missing-api", entry: "./missing.ts" }],
      outputAsFile: true,
    },
    false,
  );
  await expect(server.ssrLoadModule("virtual:importmap")).rejects.toThrow(
    /Could not resolve import-map dependency "missing-api" from "missing.ts"/,
  );
  const response = await fetch(`${origin}/app/import-map.json`);
  expect(response.status).toBe(500);
  const body = await response.text();
  expect(body).toContain("missing-api");
  expect(body).toContain(root);
});

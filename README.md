<h1 align="center">vite-import-maps</h1>

<p align="center">
  Generate browser import maps from the modules Vite resolves in development and emits in production.
</p>

<p align="center">
  <a href="https://npmjs.com/package/vite-import-maps"><img src="https://img.shields.io/npm/v/vite-import-maps.svg" alt="npm package version"></a>
  <a href="https://npmjs.com/package/vite-import-maps"><img src="https://img.shields.io/npm/dm/vite-import-maps.svg" alt="npm monthly downloads"></a>
  <a href="https://github.com/riccardoperra/vite-import-maps/actions/workflows/release.yml"><img src="https://github.com/riccardoperra/vite-import-maps/actions/workflows/release.yml/badge.svg?branch=main" alt="release workflow status"></a>
</p>

`vite-import-maps` keeps a browser [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) aligned with Vite's module resolution. Declare packages or local entry points once; the plugin resolves them through the dev server and emits dedicated chunks during a production build.

It is designed for micro-frontends, plugin systems, and applications that load ESM modules at runtime while hosting shared dependencies themselves.

- Works in Vite development and production builds
- Maps package specifiers and local ESM wrapper modules
- Injects the map into HTML, exposes it as a virtual module, or emits JSON
- Optionally adds integrity metadata to production chunks
- Runs integration tests against Vite 6, 7, and 8

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Do you need this plugin?](#do-you-need-this-plugin)
- [Configuration](#configuration)
- [Consume the import map](#consume-the-import-map)
- [Remote builds](#remote-builds)
- [CommonJS compatibility](#commonjs-compatibility)
- [Browser compatibility](#browser-compatibility-and-es-module-shims)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)
- [Development](#development)
- [License](#license)

## Install

### Requirements

- Vite 6 or newer
- A Node.js version that provides [`util.styleText`](https://nodejs.org/api/util.html#utilstyletextformat-text-options):
  - Node.js 20.12.0 or newer on the 20.x release line
  - Node.js 21.7.0 or newer on the 21.x release line
  - Node.js 22 or newer

```sh
pnpm add -D vite-import-maps
```

```sh
npm install --save-dev vite-import-maps
```

```sh
yarn add --dev vite-import-maps
```

## Quick start

Add the plugin to the host application—the application that serves the import map and shared modules:

Package entries such as `clsx` and `react` must already be installed in the host project.

```ts
import { defineConfig } from "vite";
import { viteImportMaps } from "vite-import-maps";

export default defineConfig({
  plugins: [
    viteImportMaps({
      imports: [
        // Expose installed dependencies under their package specifiers.
        "clsx",
        "react",
        "react-dom",
        "react/jsx-runtime",

        // Expose a local module under a public specifier.
        { name: "my-shared-lib", entry: "./src/my-shared-lib.ts" },
      ],
    }),
  ],
});
```

By default, the plugin prepends an import map to the generated HTML. A simplified production map looks like this:

```html
<script type="importmap">
  {
    "imports": {
      "clsx": "./clsx.js",
      "react": "./react.js",
      "react-dom": "./react-dom.js",
      "react/jsx-runtime": "./react_jsx-runtime.js",
      "my-shared-lib": "./my-shared-lib.js"
    }
  }
</script>
```

Production filenames follow your Vite output configuration, so they may include hashes.

> [!NOTE]
> React, `clsx`, and other npm packages may resolve to CommonJS entry points. The plugin provides a compatibility wrapper when it can detect their exports. For explicit control, expose a local ESM wrapper such as [`react-esm.ts`](./examples/react-host-custom/src/react-esm.ts). See [CommonJS compatibility](#commonjs-compatibility).

> [!IMPORTANT]
> If a separately built remote imports one of these specifiers, configure that dependency as external in the remote build. Otherwise the remote will bundle its own copy and the import map will not provide a shared instance.

## Do you need this plugin?

This plugin is a good fit when the browser loads ESM modules at runtime and more than one part of your application needs to resolve the same bare import specifiers.

Typical use cases include:

- **Micro-frontends** — A host and independently delivered remotes need to resolve shared dependencies such as React, Vue, or Solid.
- **Plugin systems** — Runtime-loaded plugins import APIs or libraries provided by the host application.
- **Self-hosted dependency sharing** — You want the host to build and serve shared modules instead of loading them from a public CDN.
- **Custom public entry points** — You want an import-map specifier to resolve to a local wrapper, a curated set of exports, or an application-owned module.

The plugin is most valuable when you want to use browser import maps without manually keeping development URLs and production chunk filenames in sync. The host becomes the source of truth: it resolves each configured entry with Vite, then exposes the resulting map to the browser.

### You may not need it when

- Your application does not load modules at runtime.
- Every dependency can stay inside one conventional application bundle.
- A CDN-generated import map already meets your deployment and versioning requirements.
- You need a complete micro-frontend runtime with remote discovery, version negotiation, fallbacks, or deployment orchestration. This plugin generates and exposes import maps; it does not provide those higher-level features.

### Why self-host shared modules?

Public services such as [esm.sh](https://esm.sh) and [JSPM](https://jspm.org) are convenient and may be the simplest option for some applications. Self-hosting is useful when you need tighter control over:

- **Availability** — Shared modules are deployed with infrastructure you operate.
- **Network policy** — The application does not depend on access to a public module CDN.
- **Version alignment** — The host build determines the exact dependency versions it exposes.
- **Customization** — Local ESM wrappers can adapt exports or provide application-specific entry points.

Remote modules do not need a Vite plugin to consume the generated map. They can be plain browser ESM.

## Configuration

| Option                     | Default  | Description                                                                                                                                           |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `imports`                  | required | Package specifiers or `{ name, entry }` mappings to expose. `name` is the public specifier; `entry` is the package or local file Vite resolves.       |
| `modulesOutDir`            | `""`     | Directory prefix for emitted shared chunks, relative to Vite's build output.                                                                          |
| `integrity`                | `false`  | Adds an integrity metadata map in production. `true` uses `sha384`; a hash name selects the algorithm.                                                |
| `log`                      | `false`  | Enables detailed dependency-resolution logging.                                                                                                       |
| `injectImportMapsToHtml`   | `true`   | Injects `<script type="importmap">` through Vite's `transformIndexHtml` hook. Disable it when another layer owns the HTML, including most SSR setups. |
| `importMapHtmlTransformer` | identity | Transforms the complete resolved import-map object. It can rewrite URLs or add fields such as `scopes`.                                               |
| `outputAsFile`             | `false`  | `true` serves/emits `import-map.json`; a string changes the basename, for example `"runtime-map"` produces `runtime-map.json`.                        |

### Package entries

A string uses the same value as the public specifier and the module Vite resolves:

```ts
viteImportMaps({
  imports: ["react", "react-dom", "react/jsx-runtime"],
});
```

Use the object form when the public specifier and resolved entry differ:

```ts
viteImportMaps({
  imports: [
    { name: "react", entry: "./src/react-esm.ts" },
    { name: "react/jsx-runtime", entry: "./src/react-jsx-runtime.ts" },
  ],
});
```

Local entries are useful for exposing a controlled subset of exports or wrapping a CommonJS dependency in ESM.

### Integrity metadata

Set one default for every entry, then override individual dependencies when needed:

```ts
viteImportMaps({
  integrity: "sha384",
  imports: [
    "react",
    { name: "react-dom", entry: "react-dom", integrity: "sha512" },
    { name: "my-shared-lib", entry: "./src/shared.ts", integrity: false },
  ],
});
```

Integrity hashes are calculated from emitted production chunks. Development import maps do not include integrity metadata.

### Transform the generated map

The transformer receives the full import map plus the registered entries and internal store:

```ts
viteImportMaps({
  imports: ["react"],
  importMapHtmlTransformer(importMap) {
    return {
      ...importMap,
      imports: Object.fromEntries(
        Object.entries(importMap.imports ?? {}).map(([name, url]) => [
          name,
          `/assets${url.slice(1)}`,
        ]),
      ),
    };
  },
});
```

The transformed result is shared by HTML injection, the virtual module, and JSON-file output.

## Consume the import map

An [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) tells the browser how to resolve a bare module specifier such as `clsx`. Consumers continue to write standard JavaScript imports; they do not call a plugin-specific runtime API.

For example, a remote module can import `clsx` by package name:

```js
// public/remote-widget.js
import clsx from "clsx";

export function mount(target, { active = false } = {}) {
  const button = document.createElement("button");
  button.className = clsx("remote-widget", active && "is-active");
  button.textContent = "Remote widget";
  target.append(button);
}
```

The host loads that remote by URL:

```ts
// src/main.ts
const { mount } = await import("/remote-widget.js");

mount(document.querySelector("#app")!, { active: true });
```

At runtime, the browser follows this sequence:

1. The host HTML provides the generated import map.
2. The host imports `/remote-widget.js` by URL.
3. The remote evaluates `import clsx from "clsx"`.
4. The browser resolves `clsx` to the URL recorded in the import map.

The import map must appear before any module script that uses its specifiers. The default HTML integration handles that ordering by prepending the generated `<script type="importmap">` to the document head.

### HTML injection

HTML injection is enabled by default. It is the simplest option for a client-rendered Vite host with an `index.html` entry—no additional runtime setup is required.

For a minimal repository example, compare the [basic fixture](./integration/test/fixture/basic) with its generated [Vite 8 HTML snapshot](./integration/test/__snapshot__/build-project-with-right-import-maps/vite8/index.html). The snapshot shows the import map injected ahead of the rest of the page content.

### Virtual module

The `virtual:importmap` module is always available and exports the parsed map, its JSON string, and the parsed map as the default export:

```ts
import importMap, { importMapRaw } from "virtual:importmap";
```

This is useful when an SSR framework owns the HTML document:

```ts
viteImportMaps({
  imports: ["react"],
  injectImportMapsToHtml: false,
});
```

Render `importMapRaw` inside a `<script type="importmap">` element before any module that depends on mapped specifiers.

If TypeScript cannot resolve the virtual module, add an ambient declaration in your application:

```ts
declare module "virtual:importmap" {
  const importMap: {
    imports?: Record<string, string>;
    integrity?: Record<string, string>;
    scopes?: Record<string, Record<string, string>>;
  };

  export const importMapRaw: string;
  export { importMap };
  export default importMap;
}
```

### JSON file

```ts
viteImportMaps({
  imports: ["react"],
  outputAsFile: true,
});
```

This serves `/import-map.json` in development and emits `import-map.json` at the root of the production bundle.

## Remote builds

Remote modules can be plain browser ESM. If a remote is bundled, externalize every specifier the host import map owns.

### Vite library mode

```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
    },
    rolldownOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});
```

For Vite versions that use Rollup configuration, place the same `external` array under `build.rollupOptions`.

### tsdown

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  external: ["react", "react-dom", "react/jsx-runtime"],
});
```

## CommonJS compatibility

Browser import maps resolve ESM specifiers; they do not convert CommonJS for the browser. During production builds, this plugin uses `cjs-module-lexer` to detect named exports and generate a small compatibility wrapper when possible.

That detection is necessarily heuristic. For predictable behavior, prefer packages with first-class ESM builds or expose a local ESM wrapper:

```ts
// src/legacy-lib-esm.ts
import legacyLib from "legacy-lib";

export const parse = legacyLib.parse;
export default legacyLib;
```

```ts
viteImportMaps({
  imports: [{ name: "legacy-lib", entry: "./src/legacy-lib-esm.ts" }],
});
```

See the [React host with custom ESM wrappers](./examples/react-host-custom) for a complete example.

## Browser compatibility and es-module-shims

Use [es-module-shims](https://github.com/guybedford/es-module-shims) when your browser support policy or runtime workflow needs an import-map polyfill. The map can be loaded dynamically from JSON:

```ts
import "es-module-shims";

const importMap = await fetch("/import-map.json").then((response) =>
  response.json(),
);

await importShim.addImportMap(importMap);
await importShim.import("/src/main.ts");
```

See the [React es-module-shims example](./examples/react-host-es-module-shims).

## How it works

### Development

1. Vite resolves every configured entry through its plugin container.
2. The plugin converts resolved files into dev-server URLs.
3. The current map is exposed through HTML, `virtual:importmap`, and optionally JSON.

### Production

1. The plugin creates a dedicated build input for each configured entry.
2. Vite/Rollup emits those inputs as shared chunks.
3. The plugin records final filenames and optional integrity hashes.
4. The completed map is injected or emitted with the rest of the bundle.

The production integration suite exercises this flow across Vite 6, 7, and 8. See the [fixtures](./integration/test/fixture) and [build snapshots](./integration/test/__snapshot__).

## Troubleshooting

### A dependency is bundled into a remote

Add its exact import specifier to the remote build's `external` configuration. Externalizing `react` does not automatically externalize `react/jsx-runtime`.

### A specifier resolves to the wrong module

Import-map keys are exact unless you intentionally create a trailing-slash prefix mapping. Configure every subpath your code imports, such as `react/jsx-runtime` or `solid-js/web`.

### An SSR page has no import map

Set `injectImportMapsToHtml: false`, import `virtual:importmap` in the server-rendering path, and render the script before dependent module scripts.

### A CommonJS package behaves differently between dev and build

Expose a local ESM wrapper and re-export only the API the remote consumes. This lets Vite own the CommonJS interop instead of relying on static export detection.

### A local entry cannot be resolved

Use a path relative to the Vite process working directory or an absolute path. If your Vite `root` differs from that directory, an absolute path is the least ambiguous choice.

## Examples

| Example                                                                  | Purpose                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [React host with custom wrappers](./examples/react-host-custom)          | Host-side React mappings with local ESM entry points and integrity metadata |
| [React host with es-module-shims](./examples/react-host-es-module-shims) | JSON output and dynamic import-map application                              |
| [React remote counter](./examples/react-remote-counter)                  | Vite library-mode remote with shared imports externalized                   |
| [React + TanStack Start SSR](./examples/react-tanstack-start-ssr)        | Manual import-map injection in an SSR application                           |
| [Solid host](./examples/solidjs-host)                                    | Solid host application and multiple package subpaths                        |
| [Solid remote counter](./examples/solidjs-remote-counter)                | Solid remote with shared dependencies externalized                          |
| [Vue host](./examples/vue-host-app)                                      | Vue host application                                                        |
| [Vue remote counter](./examples/vue-remote-counter)                      | Vue library-mode remote                                                     |

## Development

```sh
pnpm install
pnpm build
pnpm test
```

The test command runs production-build integration fixtures against Vite 6, 7, and 8.

## License

[MIT](./LICENSE)

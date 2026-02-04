# vite-plugin-native-import-maps

A Vite plugin that generates and keeps **browser import maps** in sync with your Vite dev server and production build.

It’s aimed at **micro-frontends**, **plugin systems**, and any setup where you load ESM modules at runtime and want to:

- share dependencies (React/Solid/etc.) **without CDNs**
- avoid bundling multiple copies of the same library
- expose either npm packages or **your own local entry modules** through an import map
- keep **remote modules truly “native”**: remotes can be shipped as plain ESM files, **without requiring a build step or special bundler plugins**

---

## Table of contents

- [Do you need this plugin?](#do-you-need-this-plugin)
- [Quick start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [What the plugin outputs](#what-the-plugin-outputs)
- [Recipes](#recipes)
- [Troubleshooting](#troubleshooting)
- [How it works (high level)](#how-it-works-high-level)
- [Examples](#examples)
- [License](#license)

---

## Do you need this plugin?

If you’re considering [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap),
you’re likely working on a micro-frontend architecture or a plugin system where:

- a **host** app loads “remote” modules at runtime (plain ESM files, not bundled together)
- host and remotes should **reuse the same dependency instances**

Tools like [Module Federation](https://module-federation.io/) are great, but can be overkill if your needs are mostly “resolve these specifiers to these URLs”.

A big advantage of import maps is that **remotes don’t need any specific build step**.
They can be published as “native” JavaScript modules (ESM) and will still be able to import shared dependencies via specifiers like `react`.

> If a remote *does* use a bundler, it’s important that shared deps are configured as **external**;
> otherwise the remote will bundle its own copy and you’ll lose the “single instance” benefit.

### Why import maps + Vite?

Import maps are a browser standard that controls how module specifiers are resolved.
They’re simple, but managing them manually is annoying:

- “which URL should `react` point to in dev?”
- “which chunk filename should it point to in production (with hashing)?”
- “how do I keep host + remotes aligned, so I don’t load React twice?”

This plugin integrates import maps with Vite so the host can expose shared modules as real Vite-built artifacts.


Example of the kind of import map it keeps up to date:

```html
<script type="importmap">
  {
    "imports": {
      "react": "/shared/react-DyndEn3u.js",
      "react/jsx-runtime": "/shared/react_jsx-runtime-CAvv468t.js"
    }
  }
</script>
```

---

## Quick start

```ts
import { defineConfig } from "vite";
import { vitePluginNativeImportMaps } from "vite-plugin-native-import-maps";

export default defineConfig({
  plugins: [
    vitePluginNativeImportMaps({
      shared: [
        "react",
        "react-dom",

        // You can also expose a custom/local entry under a public specifier
        { name: "react/jsx-runtime", entry: "./src/custom-jsx-runtime.ts" },
      ],

      // Optional
      sharedOutDir: "shared",
      log: false,
    }),
  ],
});
```

---

## Installation

```shell
# pnpm
pnpm add -D vite-plugin-native-import-maps

# npm
npm add -D vite-plugin-native-import-maps

# yarn
yarn add -D vite-plugin-native-import-maps
```

---

## Configuration

The plugin is exported as:

- `vitePluginNativeImportMaps(options): Plugin[]`

### `shared` (required)

```ts
type SharedDependencyConfig = Array<string | { name: string; entry: string }>;
```

- `"react"` means: expose the module specifier `react`.
- `{ name, entry }` means:
  - `name`: the **specifier** that will appear in the import map
  - `entry`: what Vite should **resolve/build** (a package name or a local path)

This is useful when you want to expose a modified build of a dependency, or a local “bridge” module.

### Full options

| Option | Type | Default | Notes |
|---|---|---:|---|
| `shared` | `Array<string \| { name: string; entry: string }>` | — | Shared module specifiers to expose via the import map. |
| `sharedOutDir` | `string` | `""` | Directory prefix for the emitted shared chunks in production. Examples use `"shared"`. |
| `log` | `boolean` | `false` | Enables debug-ish logging. |
| `injectImportMapsToHtml` | `boolean` | `true` | Injects a `<script type="importmap">…</script>` into the main HTML. **Set to `false` for SSR** and inject it yourself. |
| `importMapHtmlTransformer` | `(imports) => imports` | identity | Lets you rewrite the final `imports` map before it’s injected into HTML (e.g. add base path, rewrite to CDN, etc.). |
| `outputAsFile` | `boolean \| string` | `false` | When enabled, serves and emits an import map JSON file at `/<name>.json` (default name `import-map`). |

### SSR note (`injectImportMapsToHtml: false`)

On SSR frameworks the final HTML might not be produced by Vite’s `transformIndexHtml()` pipeline.
In those cases, disable auto injection and consume the import map through the virtual module:

```ts
// somewhere in your SSR HTML/template layer
import importMap from "virtual:importmap";
```

(See the TanStack Start SSR example in [`./examples/react-tanstack-start-ssr`](./examples/react-tanstack-start-ssr)).

---

## What the plugin outputs

This plugin provides the import map in three ways:

1) **HTML injection** (default)
- Adds a `<script type="importmap">…</script>` in the `<head>`.

2) **Virtual module**: `virtual:importmap`
- Always available.
- Exports:
  - `importMapRaw` (string)
  - `importMap` (object)
  - `default` export = `importMap`

3) **Optional JSON file** (`outputAsFile`)
- In dev: served by the Vite dev server at `/<name>.json`.
- In build: emitted as an asset `/<name>.json`.

---

## Recipes

### Expose local entry points (custom ESM wrappers)

A common use-case is to expose a local `react` entry that re-exports React, so you can control exactly what gets shared.

```ts
vitePluginNativeImportMaps({
  shared: [
    { name: "react", entry: "./src/react-esm.ts" },
    { name: "react/jsx-runtime", entry: "./src/react-jsx-runtime.ts" },
    "react-dom",
  ],
  sharedOutDir: "shared",
});
```

### If your remote is bundled, mark shared deps as `external`

If a remote module is built with a bundler (Rollup/Vite/esbuild/etc.), configure shared dependencies as `external`.
This ensures the remote keeps `import "react"` in the output instead of bundling React.

**tsdown example:**

```ts
// rollup.config.ts
import { defineConfig } from "tsdown";

export default defineConfig({
  // ...
  external: ["react", "react-dom", "react/jsx-runtime"],
});
```

**Vite (library mode) example:**

```ts
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});
```

### Serve a JSON import map file

```ts
vitePluginNativeImportMaps({
  shared: ["react"],
  outputAsFile: true, // serves/emits /import-map.json
});
```

or

```ts
vitePluginNativeImportMaps({
  shared: ["react"],
  outputAsFile: "my-import-map", // serves/emits /my-import-map.json
});
```

---

## Troubleshooting

### “My SSR app doesn’t show the import map”

Set `injectImportMapsToHtml: false` and inject it in your SSR HTML yourself.
Use `virtual:importmap` to read the resolved import map.

### “URLs include `?v=...` in dev and change on reload”

That’s expected. Vite uses cache-busting query strings during development.

### “A specifier resolves to the wrong module”

The specifier must match exactly what your code imports.
For example `react/jsx-runtime` is a different specifier from `react`.

### “Import maps aren’t supported in my target browser”

Import maps are a browser feature. If you need broader support, consider polyfills such as `es-module-shims`.
There’s an example host project in [`./examples/react-host-es-module-shims`](./examples/react-host-es-module-shims).

---

## How it works (high level)

- The plugin collects the `shared` entries.
- In **dev**, it resolves the corresponding Vite dev-server URLs.
- In **build**, it adds extra Rollup inputs so shared deps get their own output chunks, then records the final chunk URLs.
- It then exposes that mapping via:
  - HTML injection (optional)
  - `virtual:importmap` (always)
  - an emitted JSON file (optional)

A real build snapshot is available in:

- [`./test/fixture/basic`](./test/fixture/basic)
- [`./test/__snapshot__/build-project-with-right-import-maps`](./test/__snapshot__/build-project-with-right-import-maps)

---

## Examples

- Solid host + remote:
  - [`./examples/solidjs-host`](./examples/solidjs-host)
  - [`./examples/solidjs-remote-counter`](./examples/solidjs-remote-counter)
- React hosts:
  - [`./examples/react-host-custom`](./examples/react-host-custom)
  - [`./examples/react-host-es-module-shims`](./examples/react-host-es-module-shims)
- React remote:
  - [`./examples/react-remote-counter`](./examples/react-remote-counter)
- SSR:
  - [`./examples/react-tanstack-start-ssr`](./examples/react-tanstack-start-ssr)

---

## License

Apache-2.0. See [LICENSE](./LICENSE).

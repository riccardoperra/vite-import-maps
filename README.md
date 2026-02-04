# vite-plugin-native-import-maps

A Vite plugin that generates and keeps **browser import maps** in sync with your Vite dev server and production build.

It's aimed at **micro-frontends**, **plugin systems**, and any setup where you load ESM modules at runtime and want to:

- Share dependencies (React, Solid, etc.) **without relying on CDNs**
- Avoid bundling multiple copies of the same library
- Expose npm packages or **your own local entry modules** through an import map
- Keep **remote modules truly "native"**: remotes can be plain ESM files **without requiring a build step or special
  plugins**

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Do You Need This Plugin?](#do-you-need-this-plugin)
- [Recipes](#recipes)
- [Troubleshooting](#troubleshooting)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [License](#license)

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

## Quick Start

```ts
import {defineConfig} from "vite";
import {vitePluginNativeImportMaps} from "vite-plugin-native-import-maps";

export default defineConfig({
    plugins: [
        vitePluginNativeImportMaps({
            shared: [
                "react",
                "react-dom",
                // Expose a custom/local entry under a public specifier
                {name: "react/jsx-runtime", entry: "./src/custom-jsx-runtime.ts"},
            ],
            sharedOutDir: "shared",
        }),
    ],
});
```

---

## Configuration

### Options

- `shared` — List of modules to expose via the import map. Each entry can be a string (the specifier to expose, e.g.
  `"react"`) or an object with `name` (the specifier), `entry` (the local path or package to resolve), and optionally
  `integrity` (enable SRI hash for that dependency).

- `sharedOutDir` — Directory prefix for emitted shared chunks in production. Defaults to `""` (root of output
  directory).

- `integrity` —
  Enable [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#integrity_metadata_map)
  for all shared dependencies. Set to `true`, `"sha256"`, `"sha384"`, or `"sha512"`. This adds an `integrity` map to the
  import map so browsers can verify module contents. Can also be configured per-dependency via the object form in
  `shared`.

- `log` — Enable debug logging. Defaults to `false`.

- `injectImportMapsToHtml` — Automatically inject a `<script type="importmap">` into the HTML `<head>`. Defaults to
  `true`. Set to `false` for SSR apps and use the `virtual:importmap` module instead.

- `importMapHtmlTransformer` — A function to transform the resolved `imports` object before injecting into HTML. Useful
  for adding a base path prefix, rewriting URLs to a CDN, or filtering entries.

- `outputAsFile` — Emit the import map as a standalone JSON file. Set to `true` for `/import-map.json`, or provide a
  custom name (e.g. `"my-map"` → `/my-map.json`). The file is served by Vite in dev and emitted as an asset in build.

---

## Recipes

### Expose Local Entry Points (Custom ESM Wrappers)

Expose a local file that re-exports a dependency, giving you full control over what gets shared:

```ts
vitePluginNativeImportMaps({
    shared: [
        {name: "react", entry: "./src/react-esm.ts"},
        {name: "react/jsx-runtime", entry: "./src/react-jsx-runtime.ts"},
        "react-dom",
    ],
    sharedOutDir: "shared",
});
```

---

### Enable Integrity Checks

Add SRI hashes to verify module integrity:

```ts
vitePluginNativeImportMaps({
    shared: ["react", "react-dom"],
    integrity: "sha384", // applies to all
});

// Or per-dependency:
vitePluginNativeImportMaps({
    shared: [
        {name: "react", entry: "react", integrity: "sha384"},
        {name: "react-dom", entry: "react-dom", integrity: false},
    ],
});
```

---

### Mark Shared Deps as `external` in Remote Builds

If a remote module uses a bundler, configure shared dependencies as `external` to prevent bundling them:

**tsdown example:**

```ts
import {defineConfig} from "tsdown";

export default defineConfig({
    external: ["react", "react-dom", "react/jsx-runtime"],
});
```

**Vite (library mode) example:**

```ts
import {defineConfig} from "vite";

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

---

### Serve Import Map as JSON File

```ts
vitePluginNativeImportMaps({
    shared: ["react"],
    outputAsFile: true, // /import-map.json
});
```

---

## Troubleshooting

### SSR App Doesn't Show the Import Map

Set `injectImportMapsToHtml: false` and inject the import map yourself using `virtual:importmap`:

```ts
import importMap from "virtual:importmap";
// Inject into your SSR HTML template
```

---

### Specifier Resolves to the Wrong Module

Ensure the specifier matches exactly what your code imports:

- `react/jsx-runtime` ≠ `react`
- `solid-js/web` ≠ `solid-js`

---

### Import Maps Not Supported in Target Browser

Import maps require modern browsers. For broader support, use a polyfill
like [es-module-shims](https://github.com/guybedford/es-module-shims).

See the example: [`./examples/react-host-es-module-shims`](./examples/react-host-es-module-shims)

---

## How It Works

1. **Collects** the `shared` entries from your config
2. **In dev:** Resolves corresponding Vite dev-server URLs
3. **In build:** Adds extra Rollup inputs so shared deps get dedicated output chunks, then records the final chunk URLs
4. **Exposes** the mapping via:
    - HTML injection (optional)
    - `virtual:importmap` module (always)
    - JSON file (optional)

**Build snapshot:**

- [`./test/fixture/basic`](./test/fixture/basic)
- [`./test/__snapshot__/build-project-with-right-import-maps`](./test/__snapshot__/build-project-with-right-import-maps)

---

## Examples

| Example                                                               | Description                              |
|-----------------------------------------------------------------------|------------------------------------------|
| [`solidjs-host`](./examples/solidjs-host)                             | Solid.js host app                        |
| [`solidjs-remote-counter`](./examples/solidjs-remote-counter)         | Solid.js remote module                   |
| [`react-host-custom`](./examples/react-host-custom)                   | React host with custom ESM wrappers      |
| [`react-host-es-module-shims`](./examples/react-host-es-module-shims) | React host with es-module-shims polyfill |
| [`react-remote-counter`](./examples/react-remote-counter)             | React remote module                      |
| [`react-tanstack-start-ssr`](./examples/react-tanstack-start-ssr)     | SSR example with TanStack Start          |

---

## License

MIT. See [LICENSE](./LICENSE).

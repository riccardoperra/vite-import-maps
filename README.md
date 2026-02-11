<h1 align="center">vite-import-maps</h1>
<br/>
<p align="center">
  <a href="https://npmjs.com/package/vite-import-maps"><img src="https://img.shields.io/npm/v/vite-import-maps.svg" alt="npm package"></a>
  <a href="https://github.com/riccardoperra/vite-import-maps/actions/workflows/ci.yml"><img src="https://github.com/riccardoperra/vite-import-maps/actions/workflows/release.yml/badge.svg?branch=main" alt="build status"></a>
</p>

A Vite plugin that generates and keeps **browser [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)** in sync with your Vite dev server and production build.

It's aimed at **micro-frontends**, **plugin systems**, and any setup where you load ESM modules at runtime and want to:

- Share dependencies (React, Solid, etc.) **without relying on CDNs**
- Avoid bundling multiple copies of the same library
- Expose npm packages or **your own local entry modules** through an import map
- Keep **remote modules truly "native"**: remotes can be plain ESM files **without requiring you** to setup build step or use other plugins.

---

## Table of Contents

- [Install](#install)
- [Setup](#setup)
- [Configuration](#configuration)
- [Do You Need This Plugin?](#do-you-need-this-plugin)
- [Recipes](#recipes)
- [Troubleshooting](#troubleshooting)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [License](#license)

---

## Install

```shell
# pnpm
pnpm i -D vite-import-maps

# npm
npm i -D vite-import-maps

# yarn
yarn add -D vite-import-maps
```

## Setup

```ts
import { defineConfig } from "vite";
import { viteImportMaps } from "vite-plugin-native-import-maps";

// Host app configuration
export default defineConfig({
  plugins: [
    viteImportMaps({
      // Add SRI hashes to verify module integrity in build
      integrity: 'sha-384',
      log: true,
      imports: [
        // Wanna expose react with import maps?
        "react",
        "react-dom",
        // Expose a custom/local entry under a public specifier
        { name: "react/jsx-runtime", entry: "./src/custom-jsx-runtime.ts" },
        { name: "my-app-shared-lib", entry: "./src/my-app-shared-oib.ts" },
      ],
    }),
  ],
});
```

---

## Configuration

### Options

- `imports` — List of modules to expose via the import map. Each entry can be a string (the specifier to expose, e.g.
  `"react"`) or an object with `name` (the specifier), `entry` (the local path or package to resolve), and optionally
  `integrity` (enable SRI hash).

- `modulesOutDir` — Directory prefix for emitted shared chunks in production. Defaults to `""` (root of output
  directory).

- `integrity` —
  Enable [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#integrity_metadata_map)
  for all shared dependencies. Set to `true`, `"sha256"`, `"sha384"`, or `"sha512"`. This adds an `integrity` map to the
  import map so browsers can verify module contents. Can also be configured per-dependency via the object form in
  `imports`.

- `log` — Enable debug logging. Defaults to `false`.

- `injectImportMapsToHtml` — Automatically inject a `<script type="importmap">` into the HTML `<head>`. Defaults to
  `true`. Set to `false` for SSR apps and use the `virtual:importmap` module instead.

- `importMapHtmlTransformer` — A function to transform the resolved `imports` object before injecting into HTML. Useful
  for adding a base path prefix, rewriting URLs to a CDN, or filtering entries.

- `outputAsFile` — Emit the import map as a standalone JSON file. Set to `true` for `/import-map.json`, or provide a
  custom name (e.g. `"my-map"` → `/my-map.json`). The file is served by Vite in dev and emitted as an asset in build.

---

## Do You Need This Plugin?

If you're considering [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap),
you're likely building one of the following:

- **Micro-frontend architecture** — A host app loads remote modules at runtime, and all parts need to share the same dependency instances (React, Solid, etc.)
- **Plugin system** — Your app dynamically loads user-provided or third-party modules that rely on shared libraries
- **Self-hosted dependency sharing** — You want to share dependencies across apps without relying on external CDN services like esm.sh or jspm.io

### Why Not Third-Party Services?

Services like [esm.sh](https://esm.sh) or [jspm.io](https://jspm.io) are convenient, but they come with trade-offs:

- **External dependency** — Your app relies on a third-party service you don't control. If it goes down or changes, your app breaks.
- **Network restrictions** — Many corporate environments, VPNs, and air-gapped networks block connections to public services. Your app simply won't work.
- **Version alignment** — Ensuring host and remotes use the exact same dependency version from an external source can be error-prone.
- **Limited flexibility** — You can't easily expose modified builds, subsets of exports, or local wrapper modules.

With this plugin, **your host app becomes the source of truth**. Shared dependencies are built and served from your own infrastructure.

### Why This Plugin?

**Works in both development and production**

Most import map solutions only work at build time. This plugin keeps the import map in sync with Vite's dev server _and_ production builds. During development, it resolves to Vite's optimized deps; in production, it points to the correct hashed chunk filenames. No manual updates, no mismatches.

**No build step required for remotes**

Remote modules can be plain ESM files—no bundler, no plugins, no special conventions. They just `import "your-lib"` and the browser resolves it via the import map provided by the host.

**Single dependency instance**

Host and all remotes share the exact same module instances.

**Full control over what you share**

Expose npm packages as-is, or provide custom wrapper modules, modified builds, or local files. You decide exactly what each specifier resolves to.

> **Note:** If a remote _does_ use a bundler, shared dependencies must be marked as **external**.
> Otherwise the remote bundles its own copy and you lose the single-instance benefit.

Import maps are simple in concept, but keeping them in sync with your build is tedious:

- In dev, Vite serves optimized deps from `node_modules/.vite/deps` with cache-busting hashes
- In production, chunks have content hashes in their filenames
- Manually updating the import map every time something changes is error-prone

This plugin handles all of that. You declare what to share, and it generates the correct import map for both dev and build—automatically.

**Example output:**

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

## Recipes

### Expose Local Entry Points (Custom ESM Wrappers)

Expose a local file that re-exports a dependency, giving you full control over what gets shared:

```ts
viteImportMaps({
  imports: [
    { name: "react", entry: "./src/react-esm.ts" },
    { name: "react/jsx-runtime", entry: "./src/react-jsx-runtime.ts" },
    "react-dom",
  ],
  modulesOutDir: "shared",
});
```

---

### Enable Integrity Checks

Add SRI hashes to verify module integrity:

```ts
viteImportMaps({
  imports: ["react", "react-dom"],
  integrity: "sha384", // applies to all
});

// Or per-dependency:
viteImportMaps({
  imports: [
    { name: "react", entry: "react", integrity: "sha384" },
    { name: "react-dom", entry: "react-dom", integrity: false },
  ],
});
```

---

### Mark Shared Deps as `external` in Remote Builds

If a remote module uses a bundler, configure shared dependencies as `external` to prevent bundling them:

**tsdown example:**

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  external: ["react", "react-dom", "react/jsx-runtime"],
});
```

**Vite (library mode) example:**

```ts
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

---

### Serve Import Map as JSON File

```ts
viteImportMaps({
  imports: ["react"],
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

### Integrate with es-module-shims (dynamic import maps)

You can integrate this plugin with **es-module-shims** in two common ways depending on how you want import maps applied at runtime:

- **Apply import maps dynamically at runtime** — If you prefer the plugin to emit a JSON file (use `outputAsFile: true`) or to use the `virtual:importmap` module, you can fetch or import the map and pass it to the es-module-shims runtime via the global `importShim` API (it exposes helpers like `addImportMap` and `import`).

  ```ts
  import "es-module-shims";

  // When using outputAsFile: true (e.g. /import-map.json)
  fetch("/import-map.json")
    .then((r) => r.json())
    .then((map) => importShim.addImportMap(map))
    .then(() => importShim.import("/your/entry.js"));
  ```

  Example (virtual module):

  ```js
  import "es-module-shims";
  import importMap from "virtual:importmap";

  importShim.addImportMap(importMap).then(() => {
    // now safe to dynamically import shimmed modules
  });
  ```

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
| --------------------------------------------------------------------- | ---------------------------------------- |
| [`solidjs-host`](./examples/solidjs-host)                             | Solid.js host app                        |
| [`solidjs-remote-counter`](./examples/solidjs-remote-counter)         | Solid.js remote module                   |
| [`react-host-custom`](./examples/react-host-custom)                   | React host with custom ESM wrappers      |
| [`react-host-es-module-shims`](./examples/react-host-es-module-shims) | React host with es-module-shims polyfill |
| [`react-remote-counter`](./examples/react-remote-counter)             | React remote module                      |
| [`react-tanstack-start-ssr`](./examples/react-tanstack-start-ssr)     | SSR example with TanStack Start          |

---

## License

MIT. See [LICENSE](./LICENSE).

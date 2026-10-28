# vite-import-maps

Generate browser import maps for dependencies and local modules served by your Vite application.

[![npm version](https://img.shields.io/npm/v/vite-import-maps.svg)](https://npmjs.com/package/vite-import-maps)
[![npm downloads](https://img.shields.io/npm/dm/vite-import-maps.svg)](https://npmjs.com/package/vite-import-maps)

Declare the modules your host exposes. In development, the plugin maps their names to Vite dev-server URLs. In production, it emits shared chunks and records their filenames in an import map.

Use it for independently built micro-frontends, runtime plugins, or self-hosted shared dependencies. Consumers use standard ESM imports. The plugin handles the map; your application handles loading and mounting remote modules.

[Quick start](#quick-start) · [Options](#options) · [Recipes](#recipes) · [Outputs and SSR](#outputs-and-ssr) · [Troubleshooting](#troubleshooting) · [Contributing](#contributing)

## Quick start

Requires **Vite 6 or newer** and a Node.js version supported by your Vite version. This plugin uses `util.styleText`, which requires Node.js 20.12+, 21.7+, or 22+. Newer Vite versions have higher minimums; check [Vite's requirements](https://vite.dev/guide/).

Install the plugin in the **host** application:

```sh
pnpm add -D vite-import-maps
# npm install --save-dev vite-import-maps
# yarn add --dev vite-import-maps
```

Install any packages you want to expose. This example uses `clsx`:

```sh
pnpm add clsx
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { viteImportMaps } from "vite-import-maps";

export default defineConfig({
  plugins: [
    viteImportMaps({
      imports: ["clsx"],
      modulesOutDir: "shared",
    }),
  ],
});
```

The plugin injects an import map before the page's module scripts. A production map might look like this; filenames depend on your Vite output configuration:

```html
<script type="importmap">
  { "imports": { "clsx": "./assets/shared/clsx-abc123.js" } }
</script>
```

To try it, add a browser ESM module to the host's `public` directory:

```js
// public/remote-widget.js
import clsx from "clsx";

export function mount(target) {
  const button = document.createElement("button");
  button.className = clsx("widget", "is-ready");
  button.textContent = "Loaded with a shared dependency";
  target.append(button);
}
```

Load it from your application entry:

```ts
// src/main.ts
const remoteUrl = `${import.meta.env.BASE_URL}remote-widget.js`;
import(/* @vite-ignore */ remoteUrl).then(({ mount }) => {
  mount(document.querySelector("#app")!);
});
```

Run `pnpm vite`, or build and check the production app with `pnpm vite build` and `pnpm vite preview`. The browser resolves the widget's `clsx` import through the host's map.

**Building a separate remote?** Mark every shared specifier as external in that remote's bundler. Otherwise it bundles its own copy. See [remote builds](#remote-builds).

## Options

```ts
import type { VitePluginImportMapsConfig } from "vite-import-maps";

const options = {
  imports: ["react", "react/jsx-runtime"],
  modulesOutDir: "shared",
  outputAsFile: true,
} satisfies VitePluginImportMapsConfig;
```

| Option                      | Default  | Purpose                                                                                                                     |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `imports`                   | Required | Array of package names or `{ name, entry, integrity? }` objects.                                                            |
| `modulesOutDir`             | `""`     | Prefix for shared chunk names. Vite's output naming settings still apply.                                                   |
| `injectImportMapsToHtml`    | `true`   | Prepend an inline import map to HTML processed by Vite.                                                                     |
| `importMapScriptAttributes` | —        | Set `nonce`, `id`, and `data-*` attributes on the injected script.                                                          |
| `outputAsFile`              | `false`  | Serve/emit JSON. `true` uses `import-map.json`; `"runtime-map"` uses `runtime-map.json`. Supply a basename without `.json`. |
| `integrity`                 | `false`  | Production integrity metadata: `true` uses `sha384`; also accepts `"sha256"`, `"sha384"`, or `"sha512"`.                    |
| `importMapHtmlTransformer`  | Identity | Transform the complete map for **all** outputs, despite the option's historical name.                                       |
| `log`                       | `false`  | Enable detailed build-resolution logging.                                                                                   |

### Entries and aliases

Strings expose an installed dependency under the same name. List package subpaths explicitly:

```ts
viteImportMaps({
  imports: ["react", "react-dom/client", "react/jsx-runtime"],
});
```

The object form separates the public name from the package or file Vite resolves:

```ts
viteImportMaps({
  imports: [
    { name: "classNames", entry: "clsx" },
    { name: "@app/api", entry: "./src/shared-api.ts" },
    { name: "@app/api-legacy", entry: "./src/shared-api.ts" },
  ],
});
```

Relative local entries resolve from **Vite's `root`**. Absolute filesystem paths are also supported. Multiple names can expose the same entry; duplicate public names are rejected.

## Recipes

### TypeScript

Configuration and import-map types are exported from the package:

```ts
import type {
  VitePluginImportMapsConfig,
  SharedDependencyConfig,
  SharedDependencyObjectConfig,
  ImportMapSignature,
  ImportMapTransformerFn,
  ImportMapScriptAttributes,
  DependencyIntegrityCheck,
} from "vite-import-maps";
```

To type `virtual:importmap`, add this to `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-import-maps/client" />
```

This supplies the default `importMap` export, named `importMap`, and `importMapRaw: string`. The map has optional `imports`, `scopes`, and `integrity` fields with string URL values.

### Script attributes and CSP

```ts
viteImportMaps({
  imports: ["clsx"],
  importMapScriptAttributes: {
    id: "shared-import-map",
    nonce: nonceFromYourHtmlPipeline,
    "data-owner": "host",
  },
});
```

Supply the nonce used by your page's Content Security Policy. These attributes apply only to automatic HTML injection, and the script type remains `importmap`. For a nonce that changes with each request, let your server own the script element.

Injected JSON and `importMapRaw` escape HTML closing tags, preserving the original values when parsed.

### Integrity metadata

```ts
viteImportMaps({
  integrity: "sha384",
  imports: [
    "react",
    {
      name: "react-dom/client",
      entry: "react-dom/client",
      integrity: "sha512",
    },
    { name: "@app/api", entry: "./src/shared-api.ts", integrity: false },
  ],
});
```

Hashes cover emitted shared entry chunks. Development maps omit integrity metadata. This does not recursively add hashes for every transitive chunk or asset.

### Transform URLs or add scopes

The transformer receives the full map and `{ entries, store }` metadata. Return the map you want every output to expose:

```ts
viteImportMaps({
  imports: ["clsx"],
  importMapHtmlTransformer(map) {
    return {
      ...map,
      scopes: {
        ...map.scopes,
        "/legacy-widget/": { clsx: "/vendor/legacy-clsx.js" },
      },
    };
  },
});
```

The callback can run more than once; keep it deterministic. If you rewrite an import URL, rewrite its key in `integrity` too.

**Deployment paths:** development URLs and the JSON endpoint follow Vite's `base`. Production map URLs are relative (`./…`) to the document that installs the map. For nested HTML pages, history routes, or CDN hosting, use the transformer to make URLs absolute or root-relative. Setting Vite's `base` alone does not rewrite production import-map URLs. See [Vite's base-path guidance](https://vite.dev/guide/build#public-base-path) for the rest of the bundle.

### Remote builds

For a remote built with Vite 8:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: { entry: "./src/index.ts", formats: ["es"] },
    rolldownOptions: {
      external: ["react", "react-dom/client", "react/jsx-runtime"],
    },
  },
});
```

On Vite 6 or 7, use `build.rollupOptions` instead of `build.rolldownOptions`. With tsdown, use its top-level `external` option. Every externalized specifier must exist in the host map; externalizing `react` does not also externalize `react/jsx-runtime`.

The host's ordinary bundled imports are still processed by Vite. This plugin does not externalize the host application or negotiate dependency versions across remotes.

### CommonJS packages

The plugin detects CommonJS exports and generates ESM compatibility wrappers during production builds. Export detection is heuristic. If a package exposes an unusual API, create a local ESM wrapper with explicit exports:

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

The [React custom-wrapper example](./examples/react-host-custom) shows this approach.

## Outputs and SSR

| Output              | Development                                                    | Production                                                                                 |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Injected HTML       | Resolves entries when Vite transforms HTML.                    | Contains final shared chunk filenames and optional integrity.                              |
| JSON file           | Resolves entries on the first request, even before HTML loads. | Emitted after shared chunks are generated.                                                 |
| `virtual:importmap` | Resolves entries on demand, including an initial SSR load.     | Loaded before final chunk filenames exist; do not rely on it for the final production map. |

### JSON output

```ts
viteImportMaps({
  imports: ["clsx"],
  outputAsFile: "runtime-map",
  injectImportMapsToHtml: false,
});
```

Request `/runtime-map.json` in development, or `/app/runtime-map.json` with `base: "/app/"`. Query strings are supported. Production emits `runtime-map.json` at the build output root.

Native import maps are inline script elements; a JSON file is intended for your HTML renderer or a loader such as [es-module-shims](https://github.com/guybedford/es-module-shims). The [shims example](./examples/react-host-es-module-shims) demonstrates loading a map before importing application modules.

### Server-rendered HTML

Disable automatic injection when your framework owns the document. In development, load the virtual module from the server rendering path:

```ts
import importMap, { importMapRaw } from "virtual:importmap";
```

Render `importMapRaw` as the text of `<script type="importmap">`, before any module that uses the mapped specifiers. It is already escaped for inline HTML. An evaluated virtual module is cached by Vite; JSON and HTML requests refresh resolution, but an already loaded SSR module is not a live map subscription.

For production, enable `outputAsFile` in the **client build**, read the emitted JSON in your server's HTML pipeline, and serialize it for an inline script:

```ts
const scriptContent = JSON.stringify(productionImportMap).replace(
  /</g,
  "\\u003c",
);
```

Configure this plugin for the client build. Automatic transfer of the client map into a separate SSR build is not implemented. The [TanStack Start example](./examples/react-tanstack-start-ssr) illustrates manual rendering, but its virtual-module approach is not a complete production SSR integration.

## Troubleshooting

| Symptom                                       | Check                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Remote bundles another copy of React          | Externalize the exact shared specifiers in the remote build.                                                                         |
| Browser cannot resolve a package subpath      | Add that subpath to `imports`; keys are exact.                                                                                       |
| Development reports an unresolved entry       | Install the package, check Vite aliases, or resolve the local path from Vite's `root`. The error includes the public name and entry. |
| Map is missing from an SSR page               | Render it yourself; Vite's HTML hook only runs on HTML Vite processes. Use emitted JSON in production.                               |
| Shared chunks 404 on a nested route           | Production map URLs are document-relative. Rewrite them for your deployment using the transformer.                                   |
| CommonJS exports differ between dev and build | Expose a local ESM wrapper with explicit exports.                                                                                    |
| Dependency optimizer unavailable warning      | The plugin falls back to uncached resolution; the warning is emitted once per server.                                                |
| TypeScript cannot find `virtual:importmap`    | Add the `vite-import-maps/client` reference to an included declaration file.                                                         |

Import maps must be installed before dependent modules load. Check your target browsers' support for [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) and integrity metadata; use a shim when required by your browser policy.

## Examples

| Example                                                                             | Shows                            |
| ----------------------------------------------------------------------------------- | -------------------------------- |
| [React host with custom wrappers](./examples/react-host-custom)                     | Local ESM wrappers and integrity |
| [React host with es-module-shims](./examples/react-host-es-module-shims)            | JSON loading and dynamic imports |
| [React remote](./examples/react-remote-counter)                                     | Externalized shared dependencies |
| [Solid host](./examples/solidjs-host) / [remote](./examples/solidjs-remote-counter) | Multiple package subpaths        |
| [Vue host](./examples/vue-host-app) / [remote](./examples/vue-remote-counter)       | Vue dependency sharing           |

## Contributing

```sh
pnpm install
pnpm build            # Build the package before tests that import it
pnpm typecheck        # Source checks and consumer-facing type declarations
pnpm test --run       # Run the integration suite once
pnpm test            # Watch tests during development
```

Tests cover production builds and development servers across Vite 6, 7, and 8. Two existing CommonJS default-export build cases are skipped on Vite 6 and 7. New behavioral coverage includes aliases, first-request maps, script attributes, serialization, and output consistency.

Run `pnpm build` again after changing source when exercising examples or fixtures that import the built package. Format only the files you edit with `pnpm exec prettier --write <files>`.

See [ROADMAP.md](./ROADMAP.md) for the current audit and remaining work. Changes to the published API or behavior should include a file under `.changeset/`.

## License

[MIT](./LICENSE)

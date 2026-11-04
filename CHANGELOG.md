# vite-import-maps

## 0.3.0

### Minor Changes

- 75a7852: Add typed import-map APIs and resolve development maps on demand.

  ### New APIs
  - Export configuration, entry, map, transformer, integrity, and script-attribute types from `vite-import-maps`.
  - Add `vite-import-maps/client` declarations for the default and named `importMap` exports and `importMapRaw` from `virtual:importmap`. Enable them with `/// <reference types="vite-import-maps/client" />`.
  - Add `importMapScriptAttributes` for `id`, `nonce`, and `data-*` attributes on the injected inline script.

  ### Fixes and improvements
  - Resolve development maps on the first JSON or virtual-module request, including SSR loads, without requiring an earlier HTML request. Development module URLs honor Vite's `base`, and relative local entries resolve from Vite's `root`.
  - Accept query strings on the development JSON endpoint and send `Cache-Control: no-cache`.
  - Fix production package aliases to expose their configured entry and preserve default exports. Local aliases with matching integrity settings continue sharing a URL; different settings produce separate facades so their integrity metadata cannot overwrite each other.
  - Escape inline import-map JSON and `importMapRaw` for safe embedding in HTML. Preserve special keys such as `__proto__`, while continuing to pass ordinary objects to custom transformers.
  - Generate the virtual module's map as a JavaScript object literal, with no JSON parsing at runtime.
  - Declare `cjs-module-lexer` as a runtime dependency so installed packages can load the distributed plugin.
  - Expand the README with setup examples, configuration recipes, and SSR guidance.

  ### Migration from 0.2.x
  - **Unresolved development entries now fail explicitly.** Previously, unresolved entries were silently omitted. Install missing dependencies or correct their entry paths; errors identify the public name, entry, and Vite root.
  - **The development JSON endpoint now includes Vite's `base`.** With `base: "/app/"` and `outputAsFile: true`, request `/app/import-map.json` instead of `/import-map.json`. The default `base: "/"` keeps the existing URL. Custom JSON basenames follow the same rule; the production JSON filename is unchanged.
  - **Import-map types are stricter.** `imports` accepts string addresses, and `scopes` accepts maps of specifiers to string addresses. Custom transformers returning `null`, other non-string addresses, or incorrectly shaped scopes can now fail TypeScript checks.
  - **Keep transformers deterministic.** They can now run before an HTML request, when JSON or virtual-module output is requested. Avoid relying on a previous HTML transformation or side effects from a particular request order.
  - **Serialized JSON text can change.** Inline JSON and `importMapRaw` escape `<` and Unicode separators. Parsed values are preserved; update text snapshots or comparisons where necessary.

  ### Existing limitations

  Production `virtual:importmap` still loads before final chunk filenames are available. For production SSR, consume JSON emitted by the client build. Production map URLs remain document-relative; nested routes and CDN deployments still need URL transformation, including matching integrity keys. Evaluated development virtual modules remain cached snapshots.

## 0.2.7

### Patch Changes

- 6137d5b: fix: harden import map generation and module resolution
  - preserve ESM default exports when generating production wrappers
  - safely serialize raw import maps exposed by the virtual module
  - resolve relative local entries from the configured Vite root
  - handle normalized dependency-name collisions with incremental suffixes
  - reject duplicate public import-map specifiers
  - fall back to uncached resolution when the dev optimizer is unavailable
  - emit a single warning when the optimizer fallback is active
  - add regression coverage across Vite 6, 7, and 8
  - document Node.js requirements and expand the README
  - add a roadmap for the remaining audit tasks
  - correct the package.json module field

- 30b6057: fix: compute integrity hashes after Vite dynamic-import rewrites

## 0.2.6

### Patch Changes

- bf9581b: fix: improve cjs module detection for vite < 8

  This will fix some inconsistencies while loading ESM modules that are sometimes loaded as CJS modules in vite < 7.

  This version will also include a refactor of the test infrastructure: tests are now run for multiple vite versions to avoid regressions:
  - vite 8
  - vite 7
  - vite 6

## 0.2.5

### Patch Changes

- c206e3c: fix: support local entries referenced by absolute paths

## 0.2.4

### Patch Changes

- 1bf9211: Refactor CJS module exports detection

  Previously, cjs module exports were detected via a `createRequire` call that tried to resolve the module in Node environment,
  which causes some issues while importing modules that relies on specific global variables per environment or have side effects.

  Since this version, cjs modules exports are detected via static analysis through [node/cjs-module-lexer](https://github.com/nodejs/cjs-module-lexer)

  Fixes #18, #17

## 0.2.3

### Patch Changes

- ada5153: Fix plugin exports

## 0.2.2

### Patch Changes

- 25d1b97: Add support for CommonJS modules

  This refactor the core plugin in order to support commonjs modules.
  CommonJS modules can be either referenced via strings, or via custom entries (.cjs, .cts files).
  When encountering this type of imports, the plugin will try to resolve the module exports while loading that module via Node native api (createRequire/require)

- 25d1b97: Fix some path resolution issues in windows

## 0.2.1

### Patch Changes

- 5109dc0: Update dependencies to support vite 8

## 0.2.0

### Minor Changes

- 748ff1e: Renamed vitePluginNativeImportMaps to viteImportMaps. Add default export.

## 0.1.4

### Patch Changes

- 82cd958: Update package.json info

## 0.1.3

### Patch Changes

- 2584c9b: rename `shared` option to `imports` and `sharedOutDir` to `modulesOutDir`

## 0.1.2

### Patch Changes

- 2490e79: Improve importMapHtmlTransformer signature

## 0.1.1

### Patch Changes

- 9bd2ce2: Fix missing types in published package

## 0.1.0

### Minor Changes

- d8d4a14: Add support for vite7. SSR improvements
- 9f40567: Add support for import maps `integrity` field

## 0.0.4

### Patch Changes

- 4016f08: add support to output import maps as a file
- 91389f1: Add `virtual-modules` strategy in build mode. Add support to local entries as import maps

## 0.0.3

### Patch Changes

- add repository information to npm

## 0.0.2

### Patch Changes

- publish dist folder

## 0.0.1

### Patch Changes

- ac41be4: First release

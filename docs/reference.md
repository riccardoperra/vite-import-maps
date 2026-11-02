# API reference

`viteImportMaps(options)` returns an array of Vite plugins. The package provides named and default exports for this function.

[Integration guide](../README.md) · [Configuration](#configuration) · [Outputs](#outputs) · [TypeScript exports](#typescript-exports) · [Migration notes](#migration-from-02x)

## Requirements

The Vite peer range is `>=6.0.0`. Integration tests exercise Vite 6, 7, and 8.

The plugin uses Node.js [`util.styleText`](https://nodejs.org/api/util.html#utilstyletextformat-text-options).
That API requires Node.js 20.12 or newer on the 20.x line, 21.7 or newer on the 21.x line, or 22 or newer.
The installed Vite version can require a newer Node.js version. Both requirements apply.

## Configuration

The options type is `VitePluginImportMapsConfig`.

| Option                      | Type                                    | Default  | Behavior                                                                            |
| --------------------------- | --------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `imports`                   | `SharedDependencyConfig`                | Required | Packages or named package and file entries exposed by the host.                     |
| `modulesOutDir`             | `string`                                | `""`     | Prefix for emitted shared chunk names. Vite's output filename settings still apply. |
| `integrity`                 | `boolean` or `DependencyIntegrityCheck` | `false`  | Default integrity setting for shared entries in production.                         |
| `log`                       | `boolean`                               | `false`  | Detailed build resolution and emitted URL logs.                                     |
| `injectImportMapsToHtml`    | `boolean`                               | `true`   | Injects an inline import-map script into HTML processed by Vite.                    |
| `importMapScriptAttributes` | `ImportMapScriptAttributes`             | Omitted  | Attributes on the injected script.                                                  |
| `importMapHtmlTransformer`  | `ImportMapTransformerFn`                | Identity | Synchronous transformation of the complete map for all outputs.                     |
| `outputAsFile`              | `boolean` or `string`                   | `false`  | Serves a development JSON endpoint and emits a production JSON asset.               |

### `imports`

Each string entry uses the same value for the public specifier and the package Vite resolves.
An object entry has the following fields:

| Field       | Type                                    | Behavior                                                                                                                                              |
| ----------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | `string`                                | Required public import specifier. Duplicate names cause an error.                                                                                     |
| `entry`     | `string`                                | Required package name, package subpath, or local file path. Relative local paths resolve from Vite's `root`. Absolute filesystem paths are supported. |
| `integrity` | `boolean` or `DependencyIntegrityCheck` | Overrides the global integrity setting for this entry.                                                                                                |

Multiple public names can expose the same local file. Aliases with matching integrity settings share an emitted URL.
Aliases with different integrity settings receive separate entry chunks, because integrity metadata is keyed by URL.
Package subpaths are separate public specifiers.

### `integrity`

`true` selects `sha384`. The explicit algorithms are `sha256`, `sha384`, and `sha512`. `false` disables integrity for an entry.

Hashes cover the final emitted shared entry chunks, after Vite's chunk rewrites.
The plugin does not recursively add integrity metadata for every transitive chunk or asset. Development maps omit integrity metadata.
Browser support for import maps and their integrity metadata can differ.
The [HTML import-map reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) documents the browser behavior.

### `importMapScriptAttributes`

Accepted attributes are `id`, `nonce`, and `data-*`, with string values. Undefined values are omitted.
The injected script keeps `type="importmap"`. Attributes have no effect when HTML injection is disabled.
The option is a static object and has no per-request nonce callback.

### `importMapHtmlTransformer`

The callback receives the resolved map and metadata containing `entries` and `store`.
`entries` is a `Map` of registered public names to their URLs and optional integrity values.
The callback returns an `ImportMapSignature` synchronously.

Despite the option's name, the callback affects HTML, JSON, and virtual-module output.
It can run on the first development JSON or virtual-module request, before an HTML request.
Subsequent requests can invoke it again. A transformer that rewrites addresses must also rewrite their keys in `integrity`.

### `outputAsFile`

`true` uses `import-map.json`. A string supplies the basename without `.json`, so `"runtime-map"` produces `runtime-map.json`.

The development endpoint includes Vite's `base`, accepts query strings, and sends `Cache-Control: no-cache`.
The production asset is emitted at the build output root.
Enabling this option does not disable automatic HTML injection.

## Outputs

The plugin exposes the map through the following outputs:

| Output              | Development                                                   | Production                                                                                                 |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Injected HTML       | Resolves configured entries when Vite transforms HTML.        | Contains final shared chunk URLs and optional integrity metadata.                                          |
| JSON                | Resolves entries on request, including a request before HTML. | Contains final shared chunk URLs and optional integrity metadata.                                          |
| `virtual:importmap` | Resolves entries when Vite first loads the module.            | Loads before final chunk filenames exist. It does not provide the completed client map for production SSR. |

HTML injection prepends the map to the document head. Server-rendered documents require the server to insert the map before dependent module scripts.
Automatic transfer of a completed client map into a separate SSR build is not implemented.

### Development resolution

HTML, JSON, and virtual-module requests use the same resolver. Concurrent requests share the active resolution.
The resolver caches module URLs by the Vite dependency optimizer's browser hash.
Without that optimizer, the plugin resolves entries on each request and logs a warning once per plugin instance.
An unresolved entry causes an error containing its public name, configured entry, and Vite root.

### Production addresses

Generated addresses use `./` paths relative to the document that installs the map.
Vite's `base` does not rewrite production map addresses. A transformer can replace those addresses for nested routes or CDN hosting.
Native import maps use inline JSON. A JSON asset requires an HTML renderer or a loader such as es-module-shims.

### Virtual-module exports

`virtual:importmap` has the following exports:

| Export         | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| `importMap`    | The map as a JavaScript object literal. The generated module performs no JSON parsing. |
| `default`      | The same object as `importMap`.                                                        |
| `importMapRaw` | A JSON string with `<`, U+2028, and U+2029 escaped for an inline script.               |

The generated module preserves configured keys such as `__proto__`. The plugin does not add those keys automatically.
The serialized text can differ from `JSON.stringify(importMap)`, while parsed values remain equal.

Vite caches evaluated development virtual modules. Later HTML or JSON requests can refresh resolution, but an evaluated virtual module remains a snapshot.

## CommonJS compatibility

Production builds use static export detection to generate ESM wrappers for CommonJS packages.
Export detection is heuristic. A local ESM wrapper can expose an explicit API for packages whose exports are not detected correctly.
The [React wrapper example](../examples/react-host-custom) contains local wrappers.

## TypeScript exports

The package exports the following types:

| Type                           | Shape                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| `VitePluginImportMapsConfig`   | Plugin configuration.                                           |
| `SharedDependencyConfig`       | An array of strings and `SharedDependencyObjectConfig` entries. |
| `SharedDependencyObjectConfig` | An entry with `name`, `entry`, and optional `integrity`.        |
| `ImportMapSignature`           | Optional `imports`, `scopes`, and `integrity` dictionaries.     |
| `ImportMapTransformerFn`       | A synchronous map transformation callback.                      |
| `ImportMapScriptAttributes`    | The accepted script attributes.                                 |
| `DependencyIntegrityCheck`     | `"sha256"`, `"sha384"`, or `"sha512"`.                          |

`ImportMapSignature.imports` and `integrity` are `Record<string, string>` dictionaries.
`scopes` is a `Record<string, Record<string, string>>` dictionary. These types reject non-string addresses, including `null`.

The type-only `vite-import-maps/client` entry declares `virtual:importmap`. It has no JavaScript runtime entry.

## Migration from 0.2.x

This release changes the following behavior:

- Unresolved development entries fail explicitly instead of disappearing from the map.
- Development JSON endpoints include Vite's `base`. With `base: "/app/"`, `/import-map.json` becomes `/app/import-map.json`.
- Map types reject non-string addresses and incorrectly shaped scopes.
- Transformers can run before the first HTML request.
- Escaped inline JSON and `importMapRaw` can change text snapshots without changing parsed values.

The [integration guide](../README.md) contains the configuration and deployment procedures.

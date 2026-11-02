# vite-import-maps

Generate browser import maps for packages and local modules in a Vite application.

[![npm version](https://img.shields.io/npm/v/vite-import-maps.svg)](https://npmjs.com/package/vite-import-maps)
[![npm downloads](https://img.shields.io/npm/dm/vite-import-maps.svg)](https://npmjs.com/package/vite-import-maps)

Configure the modules your host application exposes. The plugin maps their names to Vite URLs in development and emitted chunks in production.
Independently built modules can then import those names through the browser's import map.

[Set up a host](#set-up-a-host) · [Expose modules](#expose-packages-and-local-modules) · [Configure a remote](#configure-a-remote-build) · [Use server-rendered HTML](#use-server-rendered-html) · [API reference](./docs/reference.md)

## Set up a host

Use an existing Vite application with an `#app` element and a `src/main.ts` entry.
The plugin requires Vite 6 or newer and a Node.js version that meets [both tools' requirements](./docs/reference.md#requirements).

To expose a package to a module loaded at runtime, complete these steps:

1. Install the plugin and the package in the host application.

```sh
pnpm add -D vite-import-maps
pnpm add clsx
```

2. Add the plugin to `vite.config.ts`.

```ts
import { defineConfig } from "vite";
import { viteImportMaps } from "vite-import-maps";

export default defineConfig({
	plugins: [viteImportMaps({ imports: ["clsx"], modulesOutDir: "shared" })],
});
```

3. Create `public/remote-widget.js`.

```js
import clsx from "clsx";

export function mount(target) {
	const button = document.createElement("button");
	button.className = clsx("widget", "is-ready");
	button.textContent = "Loaded with a shared dependency";
	target.append(button);
}
```

4. Load the widget from `src/main.ts`.

```ts
const remoteUrl = `${import.meta.env.BASE_URL}remote-widget.js`;
import(/* @vite-ignore */ remoteUrl).then(({ mount }) => {
	mount(document.querySelector("#app"));
});
```

5. Start the host with `pnpm exec vite`.
   Open the URL that Vite prints.
   The page displays a button labeled **Loaded with a shared dependency**.
   In the page source, the import map contains a `clsx` entry before the module scripts.

6. Run `pnpm exec vite build`.
   Start the preview with `pnpm exec vite preview`.
   Open the preview URL and check that the button appears again.
   In `dist/index.html`, the `clsx` entry points to an emitted JavaScript chunk.

For a separately built remote, [externalize its shared imports](#configure-a-remote-build) before you deploy it.

## Expose packages and local modules

Add each public specifier to `imports`. Install package entries in the host, including packages that you expose under another name.

```ts
viteImportMaps({
	imports: [
		"react",
		"react/jsx-runtime",
		{ name: "classNames", entry: "clsx" },
		{ name: "@app/api", entry: "./src/shared-api.ts" },
		{ name: "@app/legacy-api", entry: "./src/shared-api.ts" },
	],
});
```

Use `name` for the specifier a consumer imports and `entry` for the package or local file Vite resolves.
Resolve relative file paths from Vite's `root`. Use an absolute filesystem path when the file is outside that root.
List package subpaths explicitly and use a unique public name for each entry.

For CommonJS packages with an unusual API, expose a local ESM wrapper with explicit exports.
Use the [React wrapper example](./examples/react-host-custom) as a starting point.

## Configure a remote build

Mark every specifier supplied by the host as external in the remote's build configuration.
For a remote built with Vite 8, use `build.rolldownOptions.external`:

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

For Vite 6 or 7, use `build.rollupOptions.external`. For tsdown, use its top-level `external` option.
Match the host's public names exactly. Add subpaths such as `react/jsx-runtime` separately.
Inspect the remote's output and confirm that its shared imports remain bare specifiers.
Apply this configuration to the remote. The plugin leaves the host's imports under Vite's normal bundling.

Use the [React remote example](./examples/react-remote-counter) for a complete configuration.

## Request the map as JSON

Enable `outputAsFile` in the host configuration. To render the script yourself, also disable automatic HTML injection.

```ts
viteImportMaps({
	imports: ["clsx"],
	outputAsFile: "runtime-map",
	injectImportMapsToHtml: false,
});
```

Request `/runtime-map.json` in development. With Vite's `base` set to `/app/`, request `/app/runtime-map.json`.
The first request resolves the configured entries even if no HTML page has loaded. Query strings are supported.

After a production build, read `runtime-map.json` from the build output directory.
Render the map in an inline script, or pass it to a loader such as [es-module-shims](https://github.com/guybedford/es-module-shims).
For native import maps, use `<script type="importmap">` with inline JSON. An external `src` attribute does not load the map.

## Use server-rendered HTML

Configure this plugin for the client application. Disable automatic injection when your server owns the HTML document.
Use the development virtual module while the dev server runs. Use the completed client-build JSON in production.

### Render the development map

Set `injectImportMapsToHtml: false` in the client configuration.
From your development renderer, load the virtual module through your Vite dev-server instance:

```ts
const { importMapRaw } = await vite.ssrLoadModule("virtual:importmap");
const importMapScript = `<script type="importmap">${importMapRaw}</script>`;
```

Insert `importMapScript` into the document head before module scripts.
The raw JSON already escapes HTML closing tags. Use your template engine's raw HTML facility to preserve the JSON inside the script.
If your renderer needs current URLs after dependency re-optimization, request the JSON endpoint instead of reusing a virtual-module snapshot.
See [virtual-module caching](./docs/reference.md#virtual-module-exports).

### Render the production map

Enable `outputAsFile: "runtime-map"` in the client build.
Set `injectImportMapsToHtml: false` and set Vite's `build.outDir` to `dist/client`.
After the client build finishes, read the generated map in your production server:

```ts
import { readFile } from "node:fs/promises";

const map = JSON.parse(await readFile("dist/client/runtime-map.json", "utf8"));
const importMapRaw = JSON.stringify(map)
	.replace(/</g, "\\u003c")
	.replace(/\u2028/g, "\\u2028")
	.replace(/\u2029/g, "\\u2029");
const importMapScript = `<script type="importmap">${importMapRaw}</script>`;
```

Resolve the file path from your server's working directory, or replace it with an absolute path.
Insert `importMapScript` before module scripts in the rendered HTML.
For nested routes, [rewrite the production URLs](#serve-shared-chunks-from-nested-routes-or-a-cdn) before you deploy.

Use emitted JSON for production SSR. The production virtual module loads before final chunk filenames exist and does not contain the completed client map.

## Add TypeScript declarations

Add the virtual-module declaration reference to an included file such as `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-import-maps/client" />
```

Import reusable configuration types from the package:

```ts
import type { VitePluginImportMapsConfig } from "vite-import-maps";

const options = {
	imports: ["react", "react/jsx-runtime"],
	outputAsFile: true,
} satisfies VitePluginImportMapsConfig;
```

See [exported types and virtual-module exports](./docs/reference.md#typescript-exports) for the complete list.

## Serve shared chunks from nested routes or a CDN

Production addresses are relative to the document that installs the map. Setting Vite's `base` does not rewrite those addresses.
To use root-relative or CDN addresses, rewrite both `imports` and the URL keys in `integrity`.

Use this transformer in your Vite configuration. Replace `https://cdn.example.com/app/` with the directory that serves your build output.

```ts
export default defineConfig(({ command }) => ({
	plugins: [
		viteImportMaps({
			imports: ["clsx"],
			outputAsFile: true,
			importMapHtmlTransformer(map) {
				if (command === "serve") return map;
				const address = (url: string) =>
					new URL(url, "https://cdn.example.com/app/").href;
				return {
					...map,
					imports: Object.fromEntries(
						Object.entries(map.imports ?? {}).map(([name, url]) => [
							name,
							address(url),
						]),
					),
					integrity:
						map.integrity &&
						Object.fromEntries(
							Object.entries(map.integrity).map(([url, hash]) => [
								address(url),
								hash,
							]),
						),
				};
			},
		}),
	],
}));
```

Preserve the paths between emitted chunks when you upload the build output.
If you also add `scopes`, rewrite their addresses for your deployment.
Keep the transformer deterministic. See the [transformer reference](./docs/reference.md#importmaphtmltransformer) for its inputs and invocation timing.

## Set script attributes and integrity

To identify the injected script, set `importMapScriptAttributes` in the plugin configuration:

```ts
viteImportMaps({
	imports: ["clsx"],
	importMapScriptAttributes: { id: "shared-import-map", "data-owner": "host" },
});
```

To set a CSP nonce, add `nonce` with the value from your Content Security Policy.
If the nonce changes on each request, render the script in your server's HTML pipeline.

To add integrity metadata to shared production entries, set `integrity: true` for SHA-384 or select an algorithm explicitly:

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

Review the [integrity coverage and browser requirements](./docs/reference.md#integrity) before you rely on those checks.

## Troubleshoot an integration

Use the following checks for common failures:

- If a remote bundles another copy of React, externalize its shared specifiers and inspect the remote output.
- If a package subpath fails to resolve, add that exact subpath to the host's `imports`.
- If development reports an unresolved entry, install the package or correct its path relative to Vite's `root`.
- If a JSON request returns HTML, include Vite's `base` in the request URL and check `outputAsFile`.
- If shared chunks return 404 on nested routes, rewrite the production map's URLs.
- If an SSR page has no map, render the development virtual module or production client-build JSON before module scripts.
- If TypeScript cannot find `virtual:importmap`, add the `vite-import-maps/client` reference to an included declaration file.
- If Vite reports that the dependency optimizer is unavailable, check the resolved URLs. The plugin continues with uncached resolution.

To upgrade from 0.2.x, review the [migration notes](./docs/reference.md#migration-from-02x).

## Explore the examples

Choose an example for your integration:

- [React host with custom wrappers](./examples/react-host-custom).
- [React host with es-module-shims](./examples/react-host-es-module-shims).
- [React remote](./examples/react-remote-counter).
- [Solid host](./examples/solidjs-host) and [Solid remote](./examples/solidjs-remote-counter).
- [Vue host](./examples/vue-host-app) and [Vue remote](./examples/vue-remote-counter).

For repository development, use the [contribution guide](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)

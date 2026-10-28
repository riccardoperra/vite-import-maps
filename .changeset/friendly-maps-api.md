---
"vite-import-maps": minor
---

Add typed import-map APIs and resolve development maps on demand.

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

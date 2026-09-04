---
"vite-import-maps": minor
---

Add developer-facing import-map APIs and improve resolution across output modes.

- Export configuration and map types, with virtual-module declarations available through `vite-import-maps/client`.
- Add `importMapScriptAttributes` for inline script IDs, CSP nonces, and data attributes.
- Resolve development maps on demand for JSON and virtual-module requests, including Vite base paths, query strings, root-relative local entries, and actionable errors.
- Fix package aliases and preserve default exports. Keep shared URLs for local aliases with matching integrity settings, and use separate facades for aliases with different settings. Cover reused plugin instances with repeated-build tests.
- Escape inline import-map JSON and preserve special keys in virtual-module exports.
- Declare `cjs-module-lexer` as a runtime dependency.
- Restore direct typechecking, add cross-version regressions, and rewrite the README with setup recipes and production SSR limitations.

Import-map address types now require strings, and unresolved development entries report an error instead of being silently omitted.

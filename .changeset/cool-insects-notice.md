---
"vite-import-maps": patch
---

Add support for CommonJS modules

This refactor the core plugin in order to support commonjs modules.
CommonJS modules can be either referenced via strings, or via custom entries (.cjs, .cts files).
When encountering this type of imports, the plugin will try to resolve the module exports while loading that module via Node native api (createRequire/require)

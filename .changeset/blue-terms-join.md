---
"vite-import-maps": patch
---

fix: improve cjs module detection for vite < 8

This will fix some inconsistencies while loading ESM modules that are sometimes loaded as CJS modules in vite < 7.

This version will also include a refactor of the test infrastructure: tests are now run for multiple vite versions to avoid regressions:
- vite 8
- vite 7
- vite 6

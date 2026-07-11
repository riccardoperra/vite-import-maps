---
"vite-import-maps": patch
---

fix: harden import map generation and module resolution

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

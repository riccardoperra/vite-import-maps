---
"vite-import-maps": patch
---

Refactor CJS module exports detection

Previously, cjs module exports were detected via a `createRequire` call that tried to resolve the module in Node environment,
which causes some issues while importing modules that relies on specific global variables per environment or have side effects.

Since this version, cjs modules exports are detected via static analysis through [node/cjs-module-lexer](https://github.com/nodejs/cjs-module-lexer)

Fixes #18, #17

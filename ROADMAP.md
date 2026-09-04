# Project roadmap

Last reviewed: 2026-09-04. This reflects the current source and test coverage; completed work may not yet be published to npm.

## Current state

The plugin generates HTML and JSON import maps from production chunks and resolves development maps through Vite. Integration tests exercise Vite 6, 7, and 8. The starting audit passed 26 tests with two CommonJS default-export cases skipped; direct TypeScript validation failed before this update. After incorporating the current main branch and its integrity regressions, the updated suite passes 58 tests with the same two skips, and source and consumer type checks pass.

The README now starts with a runnable host/remote example, documents public options and types, and separates development virtual-module support from production SSR limitations.

## Features implemented in this update

| Feature                      | Developer benefit                                                                                                                                                                                | Verification                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| On-demand development maps   | JSON requests and initial SSR virtual-module loads resolve entries without a prior HTML request. Dev URLs and JSON routes honor Vite's base; unresolved entries report the name, path, and root. | Real servers with Vite 6/7/8; optimizer enabled and disabled; JSON-first and SSR-first; fetch mapped modules; compare output channels. |
| Public TypeScript API        | Exported configuration/map types and `vite-import-maps/client` declarations remove handwritten ambient modules.                                                                                  | Consumer type checks through the package exports, including invalid-value assertions.                                                  |
| Import-map script attributes | Set an ID, CSP nonce, or `data-*` attribute on the generated inline script.                                                                                                                      | Real builds with Vite 6/7/8; HTML attribute escaping and preserved `importmap` type.                                                   |

Additional corrections shipped alongside these features:

- Package aliases re-export their configured entry, including CommonJS dependencies.
- Multiple names for a local entry keep their mappings and default/named exports. Matching integrity settings preserve the shared URL behavior from main; different settings use separate facades to avoid overwriting URL-keyed integrity metadata.
- Repeated-build coverage verifies main's registration reset when a plugin instance is reused.
- Inline JSON escapes HTML closing tags, and virtual parsed exports preserve special keys such as `__proto__`.
- Direct source typechecking and consumer declaration checks run in pull-request and release CI.
- `cjs-module-lexer` is a runtime dependency, matching the published bundle's external import.

## Previous audit status

| ID         | Status   | Notes                                                                                                                 |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| DOC-001    | Complete | README rewritten with tested recipes and explicit lifecycle limitations.                                              |
| CORE-001   | Complete | ESM default exports preserved; alias loading also waits for final module export information.                          |
| CORE-002   | Complete | Virtual-module strings safely serialized; inline HTML and special object keys covered too.                            |
| RES-001    | Complete | Relative local entries resolve from Vite root in development and production.                                          |
| RES-002    | Partial  | Normalized-name collisions and duplicate public names have isolated coverage; add an actual build collision fixture.  |
| DEV-001    | Complete | Missing optimizer falls back to uncached resolution; real server coverage added.                                      |
| TOOL-001   | Complete | `pnpm typecheck` checks source and the package's public declarations.                                                 |
| API-001    | Complete | Public types and virtual-module declarations exported.                                                                |
| PKG-001    | Complete | Existing corrected `module` field retained; package contents checked.                                                 |
| TEST-001   | Complete | Development-server integration coverage added.                                                                        |
| TEST-002   | Partial  | Development output consistency and production HTML/JSON covered; production virtual-map/SSR lifecycle remains open.   |
| TEST-003   | Open     | Two default-export CommonJS fixtures remain skipped on Vite 6/7. New CommonJS alias tests pass on all three versions. |
| TEST-004   | Partial  | Local resolution and aliases have real builds; normalized-name collision fixture still needed.                        |
| COMPAT-001 | Open     | README documents Node API requirements; package engines and minimum-version CI still need alignment.                  |
| PKG-002    | Partial  | Runtime lexer dependency corrected. Review optional Vite/Rollup/Rolldown peer metadata separately.                    |

## Next features to consider

These remain proposals, outside this update's implemented scope.

1. **Production SSR map handoff.** Supply the completed client map to a separate server build or rendering pipeline. Avoid embedding an empty map when `virtual:importmap` loads before chunk generation. Acceptance: independently built client/server outputs render the same final URLs and integrity hashes without manual JSON plumbing.
2. **Deployment-aware production URLs.** Honor Vite's absolute, relative, and CDN bases while keeping HTML and standalone JSON semantics clear. Acceptance: nested HTML pages and history routes load every shared chunk, with integrity keys matching rewritten URLs.
3. **Live map refresh.** Invalidate evaluated development virtual modules when optimizer metadata changes. Acceptance: an SSR process receives updated URLs after dependency re-optimization without restarting.
4. **Broader compatibility checks.** Close skipped CommonJS cases, add Windows path/collision fixtures, validate peer requirements in isolated consumer installs, and test the declared minimum Node versions.

# Project roadmap

This roadmap turns the repository audit into trackable engineering work. It focuses on correctness first, then compatibility, test coverage, and package quality.

Last updated: 2026-07-11

## Status legend

| Status         | Meaning                                                           |
| -------------- | ----------------------------------------------------------------- |
| ✅ Done        | Implemented and verified against its acceptance criteria          |
| 🔵 In review   | Implementation exists and is awaiting final verification or merge |
| 🟡 In progress | Work has started but is not ready for review                      |
| ⬜ Planned     | Scoped but not started                                            |
| ⛔ Blocked     | Cannot proceed until the documented blocker is resolved           |

## Current overview

| ID         | Priority | Status         | Work item                                               |
| ---------- | -------- | -------------- | ------------------------------------------------------- |
| DOC-001    | P1       | 🔵 In review   | Refactor and expand the README                          |
| PKG-001    | P2       | 🟡 In progress | Correct the `module` package field                      |
| CORE-001   | P0       | 🔵 In review   | Preserve ESM default exports in production wrappers     |
| CORE-002   | P0       | 🔵 In review   | Serialize `virtual:importmap` output safely             |
| RES-001    | P1       | 🔵 In review   | Resolve local entries from the Vite root                |
| RES-002    | P1       | 🔵 In review   | Prevent normalized dependency-name collisions           |
| DEV-001    | P1       | 🔵 In review   | Support dev environments without a dependency optimizer |
| COMPAT-001 | P1       | 🟡 In progress | Define and enforce the supported Node.js range          |
| TOOL-001   | P1       | ⬜ Planned     | Restore direct TypeScript validation                    |
| API-001    | P2       | ⬜ Planned     | Export the public configuration types                   |
| PKG-002    | P2       | ⬜ Planned     | Review peer dependency requirements                     |
| TEST-001   | P1       | 🟡 In progress | Add development-server integration coverage             |
| TEST-002   | P1       | 🟡 In progress | Cover all import-map output mechanisms                  |
| TEST-003   | P1       | ⬜ Planned     | Complete CommonJS coverage across Vite versions         |
| TEST-004   | P2       | 🟡 In progress | Add resolution and collision regression fixtures        |

## Phase 1 — Correctness and runtime safety

### CORE-001 — Preserve ESM default exports in production wrappers

- **Priority:** P0
- **Status:** 🔵 In review
- **Decision:** Export `default` only when the resolved ESM module declares it.
- **Current state:** Implemented and covered by the basic fixture across Vite 6, 7, and 8.
- **Area:** [`src/build-only/virtual-chunk-resolver.ts`](./src/build-only/virtual-chunk-resolver.ts)
- **Problem:** Production wrappers use `export * from "dependency"`, which does not re-export the dependency's default export. A dependency can therefore work in development but lose its default export after a production build.
- **Implementation notes:**
  - Determine whether the resolved ESM module exposes a default export.
  - Generate a default re-export only when it is valid.
  - Preserve named exports and side effects.
  - Avoid changing the existing CommonJS wrapper behavior unintentionally.
- **Acceptance criteria:**
  - A fixture with both default and named ESM exports works in development and production.
  - The default export is present in builds produced with Vite 6, 7, and 8.
  - Existing build snapshots and CommonJS fixtures continue to pass.

### CORE-002 — Serialize `virtual:importmap` output safely

- **Priority:** P0
- **Status:** 🔵 In review
- **Decision:** Accepted for implementation.
- **Current state:** Implemented with regression coverage for quotes, newlines, and Unicode separators.
- **Area:** [`src/import-map-module.ts`](./src/import-map-module.ts)
- **Problem:** `importMapRaw` is embedded inside a generated single-quoted JavaScript string. An apostrophe or another string-sensitive character introduced by a transformer can generate invalid module code.
- **Implementation notes:**
  - Serialize the raw JSON string as a JavaScript string literal instead of interpolating it directly.
  - Keep the named and default parsed-map exports unchanged.
- **Acceptance criteria:**
  - Maps containing apostrophes, quotes, newlines, and Unicode separators load successfully.
  - `importMapRaw`, `importMap`, and the default export contain equivalent data.
  - A regression test imports the generated virtual module rather than checking only its source text.

## Phase 2 — Resolution and environment compatibility

### RES-001 — Resolve local entries from the Vite root

- **Priority:** P1
- **Status:** 🔵 In review
- **Decision:** Accepted for implementation.
- **Current state:** Implemented with a custom-root local-entry fixture across Vite 6, 7, and 8. Windows CI verification remains pending.
- **Area:** [`src/build-only/virtual-chunk-generator.ts`](./src/build-only/virtual-chunk-generator.ts)
- **Problem:** Relative local entries are resolved from `process.cwd()` instead of Vite's resolved `root`. This is ambiguous in monorepos and projects with a custom root.
- **Implementation notes:**
  - Capture the resolved Vite configuration or use Vite's resolver for local entries.
  - Preserve absolute-path and Windows-path support.
- **Acceptance criteria:**
  - A fixture with `root` different from `process.cwd()` resolves a relative local entry correctly.
  - Absolute local entries continue to work on all CI operating systems.
  - README guidance can describe paths relative to the Vite root.

### RES-002 — Prevent normalized dependency-name collisions

- **Priority:** P1
- **Status:** 🔵 In review
- **Decision:** Preserve readable names when unique and append an incremental suffix only when a collision occurs.
- **Current state:** Implemented with coverage for readable names, incremental collision suffixes, and duplicate public specifiers.
- **Area:** [`src/utils.ts`](./src/utils.ts), [`src/store.ts`](./src/store.ts)
- **Problem:** Replacing `/` with `_` means different specifiers such as `foo/bar` and `foo_bar` normalize to the same virtual ID and output name.
- **Implementation notes:**
  - Keep the current readable normalized name when it is unique.
  - When that name is occupied, append the first available incremental suffix: `foo_bar`, `foo_bar_1`, `foo_bar_2`.
  - Detect duplicate public names and duplicate generated IDs early.
  - Return an actionable configuration error instead of silently overwriting an entry.
- **Acceptance criteria:**
  - Previously colliding specifiers produce distinct chunks and import-map entries.
  - Exact duplicate public specifiers fail with a clear error.
  - Scoped packages and package subpaths retain readable output names.

### DEV-001 — Support dev environments without a dependency optimizer

- **Priority:** P1
- **Status:** 🔵 In review
- **Feasibility:** Confirmed. The optimizer currently supplies only the browser-hash cache key; module resolution already goes through Vite's plugin container.
- **Decision:** Resolve on every HTML transformation when no browser hash is available and emit one warning per plugin instance.
- **Current state:** Implemented with isolated hook coverage. A real dev-server integration test remains pending.
- **Area:** [`src/dev/dev-plugin.ts`](./src/dev/dev-plugin.ts)
- **Problem:** The development plugin assumes `clientEnvironment.depsOptimizer` always exists. Disabled optimization or a different environment configuration can cause a runtime exception.
- **Implementation notes:**
  - Treat the optimizer and its metadata as optional.
  - Fall back to resolving configured entries on each HTML transformation when the browser hash is unavailable.
  - Clear stale store entries when the resolved dependency set changes.
- **Acceptance criteria:**
  - Development works with dependency optimization enabled and disabled.
  - A missing optimizer does not throw.
  - Cache invalidation updates the generated map when resolved URLs change.

### COMPAT-001 — Define and enforce the supported Node.js range

- **Priority:** P1
- **Status:** 🟡 In progress
- **Area:** [`package.json`](./package.json), CI workflows, uses of `node:util` `styleText`
- **Problem:** Runtime code uses Node APIs that are unavailable in some Node versions supported by Vite 6, while the package does not declare a Node.js engine requirement.
- **Decision:** Keep `styleText`. Document Node.js 20.12.0+, 21.7.0+, and 22+ as the supported minimums for their respective release lines.
- **Current state:** The Node.js requirement is documented in the README. Package metadata and CI enforcement remain pending.
- **Implementation notes:**
  - Add an equivalent range to `package.json#engines`, for example `>=20.12.0 <21 || >=21.7.0`.
  - Test the minimum and current supported Node versions in CI.
- **Acceptance criteria:**
  - Installing on an unsupported Node version produces a clear package-manager warning.
  - Build and tests pass on the minimum declared Node version.
  - The documented Vite and Node compatibility ranges agree.

## Phase 3 — Tooling, API, and package quality

### TOOL-001 — Restore direct TypeScript validation

- **Priority:** P1
- **Status:** ⬜ Planned
- **Area:** [`tsconfig.json`](./tsconfig.json), [`package.json`](./package.json)
- **Problem:** `tsc -p tsconfig.json` fails because `isolatedDeclarations` is enabled without `declaration` or `composite`.
- **Implementation notes:**
  - Separate type-checking and declaration-build configurations if necessary.
  - Add a dedicated `typecheck` script.
  - Run it in pull-request and release CI.
- **Acceptance criteria:**
  - `pnpm typecheck` succeeds from a clean checkout.
  - CI fails on source type errors independently of the package bundler.
  - Declaration generation through `tsdown` still succeeds.

### API-001 — Export the public configuration types

- **Priority:** P2
- **Status:** ⬜ Planned
- **Area:** [`src/index.ts`](./src/index.ts), [`src/config.ts`](./src/config.ts)
- **Problem:** Configuration and import-map types appear in generated declarations but cannot be imported from the package entry point.
- **Implementation notes:**
  - Export only the types intended as stable public API.
  - Consider exporting `VitePluginImportMapsConfig`, `SharedDependencyConfig`, `SharedDependencyObjectConfig`, `ImportMapSignature`, and `ImportMapTransformerFn`.
- **Acceptance criteria:**
  - A consumer type test can import every documented public type from `vite-import-maps`.
  - Internal store and build metadata types remain private.
  - The README uses exported names where appropriate.

### PKG-001 — Correct the `module` package field

- **Priority:** P2
- **Status:** 🟡 In progress
- **Area:** [`package.json`](./package.json)
- **Current state:** The working tree already changes `"module "` to `"module"`.
- **Acceptance criteria:**
  - `publint` passes.
  - The package dry run contains the expected ESM entry point and declaration file.
  - The correction is included in the next release changeset if required by the release policy.

### PKG-002 — Review peer dependency requirements

- **Priority:** P2
- **Status:** ⬜ Planned
- **Area:** [`package.json`](./package.json)
- **Problem:** Vite, Rollup, and Rolldown are all optional peers even though the distributed package imports Vite at runtime. This can hide missing or unnecessary requirements from consumers.
- **Implementation notes:**
  - Make Vite a required peer unless a supported non-Vite use case is documented and tested.
  - Determine whether direct Rollup and Rolldown peers are necessary.
  - Verify installation behavior with npm, pnpm, and Yarn.
- **Acceptance criteria:**
  - A clean consumer installation receives correct peer dependency guidance.
  - No redundant build-engine peer is required from application users.
  - `publint` and package-manager installation fixtures pass.

## Phase 4 — Test coverage and regression protection

### TEST-001 — Add development-server integration coverage

- **Priority:** P1
- **Status:** 🟡 In progress
- **Current state:** Isolated plugin coverage exists for the missing-optimizer fallback and warning behavior. End-to-end server coverage remains pending.
- **Covers:** development resolution, optimizer presence/absence, caching, HTML injection, and dev JSON output.
- **Acceptance criteria:**
  - Tests start a Vite dev server and request generated HTML and JSON.
  - Tests verify resolved URLs rather than only checking HTTP status.
  - At least one local entry and one installed package are covered.

### TEST-002 — Cover every import-map output mechanism

- **Priority:** P1
- **Status:** 🟡 In progress
- **Current state:** The virtual module now has executable regression coverage. HTML, JSON, transformer consistency, and SSR coverage remain pending.
- **Covers:** HTML injection, `virtual:importmap`, `outputAsFile`, transformers, SSR/manual injection, and output consistency.
- **Acceptance criteria:**
  - All three output mechanisms return the same transformed map.
  - Custom JSON basenames are tested in development and production.
  - SSR builds do not emit or resolve unintended client-only chunks.

### TEST-003 — Complete CommonJS coverage across Vite versions

- **Priority:** P1
- **Status:** ⬜ Planned
- **Area:** [`integration/test/build.test.ts`](./integration/test/build.test.ts)
- **Problem:** Default-export CommonJS coverage is currently skipped on Vite 6 and 7.
- **Acceptance criteria:**
  - The expected support policy for CommonJS default and named exports is explicit.
  - Supported behavior is tested on Vite 6, 7, and 8.
  - Unsupported cases produce documented limitations or actionable errors.

### TEST-004 — Add resolution and collision regression fixtures

- **Priority:** P2
- **Status:** 🟡 In progress
- **Current state:** Custom-root resolution, normalized-name collisions, and duplicate public names are covered. Windows paths, scoped packages, and full duplicate-input build coverage remain pending.
- **Covers:** custom Vite roots, absolute entries, Windows paths, scoped packages, subpaths, duplicate inputs, and normalized-name collisions.
- **Acceptance criteria:**
  - Each resolution edge case has a focused fixture and assertion.
  - Fixtures run across the supported Vite matrix where behavior differs.
  - Snapshot output remains deterministic across operating systems.

## Documentation

### DOC-001 — Refactor and expand the README

- **Priority:** P1
- **Status:** 🔵 In review
- **Area:** [`README.md`](./README.md)
- **Current state:** The working tree contains the revised positioning, quick start, configuration reference, consumption walkthrough, SSR guidance, CommonJS notes, examples, and troubleshooting content.
- **Acceptance criteria:**
  - All local links resolve.
  - README formatting and package dry run pass.
  - Technical claims remain aligned with implemented and tested behavior.
  - The final copy is approved and merged.

## Definition of done

A roadmap item can move to **Done** only when:

1. The implementation and regression tests are complete.
2. `pnpm build`, `pnpm test`, linting, type-checking, and package validation pass where applicable.
3. User-facing behavior and limitations are documented.
4. Compatibility is verified across the affected Vite, Node.js, and operating-system matrix.
5. A changeset is added when the change affects the published package.

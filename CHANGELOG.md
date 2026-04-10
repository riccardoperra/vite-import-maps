# vite-import-maps

## 0.2.4

### Patch Changes

- 1bf9211: Refactor CJS module exports detection

  Previously, cjs module exports were detected via a `createRequire` call that tried to resolve the module in Node environment,
  which causes some issues while importing modules that relies on specific global variables per environment or have side effects.

  Since this version, cjs modules exports are detected via static analysis through [node/cjs-module-lexer](https://github.com/nodejs/cjs-module-lexer)

  Fixes #18, #17

## 0.2.3

### Patch Changes

- ada5153: Fix plugin exports

## 0.2.2

### Patch Changes

- 25d1b97: Add support for CommonJS modules

  This refactor the core plugin in order to support commonjs modules.
  CommonJS modules can be either referenced via strings, or via custom entries (.cjs, .cts files).
  When encountering this type of imports, the plugin will try to resolve the module exports while loading that module via Node native api (createRequire/require)

- 25d1b97: Fix some path resolution issues in windows

## 0.2.1

### Patch Changes

- 5109dc0: Update dependencies to support vite 8

## 0.2.0

### Minor Changes

- 748ff1e: Renamed vitePluginNativeImportMaps to viteImportMaps. Add default export.

## 0.1.4

### Patch Changes

- 82cd958: Update package.json info

## 0.1.3

### Patch Changes

- 2584c9b: rename `shared` option to `imports` and `sharedOutDir` to `modulesOutDir`

## 0.1.2

### Patch Changes

- 2490e79: Improve importMapHtmlTransformer signature

## 0.1.1

### Patch Changes

- 9bd2ce2: Fix missing types in published package

## 0.1.0

### Minor Changes

- d8d4a14: Add support for vite7. SSR improvements
- 9f40567: Add support for import maps `integrity` field

## 0.0.4

### Patch Changes

- 4016f08: add support to output import maps as a file
- 91389f1: Add `virtual-modules` strategy in build mode. Add support to local entries as import maps

## 0.0.3

### Patch Changes

- add repository information to npm

## 0.0.2

### Patch Changes

- publish dist folder

## 0.0.1

### Patch Changes

- ac41be4: First release

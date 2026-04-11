import * as path from "node:path";

export const isWindows = process.platform === "win32";

/**
 * Normalize a dependency name to be used as an entrypoint input
 *
 * @example
 * ```
 * @scope/package-name -> @scope_package-name
 * package-name/sub-entrypoint -> package-name_sub-entrypoint
 * ```
 */
export function normalizeDependencyName(dep: string): string {
  return dep.replace(/\//g, "_");
}

/**
 * Prefix for resolved fs paths, since windows paths may not be valid as URLs.
 *
 * @see https://github.com/vitejs/vite/blob/fd38d076fe2455aac1e00a7b15cd51159bf12bb5/packages/vite/src/node/constants.ts#L108
 */
export const FS_PREFIX = `/@fs/`;

export function fileToUrl(file: string, root: string): string {
  const url = path.relative(root, file);
  // out of root, use /@fs/ prefix
  if (url[0] === ".") {
    return path.posix.join(FS_PREFIX, normalizePath(file));
  }
  // file within root, create root-relative url
  return "/" + normalizePath(url);
}

export function isLocalEntry(url: string) {
  return url.startsWith("./") || url.startsWith("../") || isAbsolute(url);
}

const windowsSlashRE = /\\/g;
export function slash(p: string): string {
  return p.replace(windowsSlashRE, "/");
}

export function isAbsolute(id: string) {
  return path.posix.isAbsolute(id) || path.win32.isAbsolute(id);
}

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

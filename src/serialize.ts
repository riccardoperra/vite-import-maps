import type { ImportMapSignature } from "./config.js";

/** Serialize JSON for an inline script without allowing HTML closing tags. */
export function serializeImportMap(importMap: ImportMapSignature): string {
  return JSON.stringify(importMap)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

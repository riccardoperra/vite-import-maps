declare module "virtual:importmap" {
  import type { ImportMapSignature } from "vite-import-maps";

  export const importMap: ImportMapSignature;
  /** JSON safe to embed as the text content of an inline import-map script. */
  export const importMapRaw: string;
  export default importMap;
}

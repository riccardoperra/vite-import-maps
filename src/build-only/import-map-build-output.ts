import type { OutputBundle } from "rolldown";
import type { VitePluginImportMapsStore } from "../store.js";

let importMapBuildOutputId = 0;

export class ImportMapBuildOutput {
  readonly placeholder: string;

  constructor() {
    this.placeholder = JSON.stringify(
      `vite-import-maps-${importMapBuildOutputId++}-placeholder`,
    );
  }

  finalize(bundle: OutputBundle, store: VitePluginImportMapsStore): void {
    const outputs = Object.values(bundle).filter(
      (output) =>
        output.type === "asset" &&
        typeof output.source === "string" &&
        output.source.includes(this.placeholder),
    );

    if (outputs.length === 0) return;

    const importMap = store.getImportMapAsJson();
    const compactImportMap = JSON.stringify(importMap);
    const formattedImportMap = JSON.stringify(importMap, null, 2);

    for (const output of outputs) {
      const source = output.source as string;
      const serializedImportMap =
        source.trim() === this.placeholder
          ? formattedImportMap
          : compactImportMap;
      output.source = source.replaceAll(this.placeholder, serializedImportMap);
    }
  }
}

import type { OutputBundle } from "rolldown";
import type { VitePluginImportMapsStore } from "../store.js";

let importMapBuildOutputId = 0;

export class ImportMapBuildOutput {
  readonly htmlPlaceholder: string;
  readonly filePlaceholder: string;

  constructor() {
    const id = importMapBuildOutputId++;
    this.htmlPlaceholder = JSON.stringify({
      imports: {},
      __vite_import_maps_placeholder__: `${id}:html`,
    });
    this.filePlaceholder = JSON.stringify({
      imports: {},
      __vite_import_maps_placeholder__: `${id}:file`,
    });
  }

  finalize(bundle: OutputBundle, store: VitePluginImportMapsStore): void {
    let importMap:
      | ReturnType<VitePluginImportMapsStore["getImportMapAsJson"]>
      | undefined;

    const getImportMap = (): ReturnType<
      VitePluginImportMapsStore["getImportMapAsJson"]
    > => {
      importMap ??= store.getImportMapAsJson();
      return importMap;
    };

    for (const output of Object.values(bundle)) {
      if (output.type !== "asset" || typeof output.source !== "string") {
        continue;
      }

      let source = output.source;

      if (source.includes(this.htmlPlaceholder)) {
        const serializedImportMap = JSON.stringify(getImportMap());
        source = source.split(this.htmlPlaceholder).join(serializedImportMap);
      }

      if (source.includes(this.filePlaceholder)) {
        const serializedImportMap = JSON.stringify(getImportMap(), null, 2);
        source = source.split(this.filePlaceholder).join(serializedImportMap);
      }

      output.source = source;
    }
  }
}

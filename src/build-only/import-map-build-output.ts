import type { OutputBundle } from "rolldown";
import type { VitePluginImportMapsStore } from "../store.js";

let importMapBuildOutputId = 0;

export const importMapBuildMarkerAttribute = "data-vite-import-maps";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function finalizeHtmlImportMap(
  source: string,
  marker: string,
  importMap: string,
): string {
  const escapedMarker = escapeRegExp(marker);
  const script = new RegExp(
    `(<script\\b(?=[^>]*\\b${importMapBuildMarkerAttribute}\\s*=\\s*["']${escapedMarker}["'])[^>]*>)[\\s\\S]*?(<\\/script\\s*>)`,
    "gi",
  );
  const markerAttribute = new RegExp(
    `\\s+${importMapBuildMarkerAttribute}\\s*=\\s*["']${escapedMarker}["']`,
    "i",
  );

  return source.replace(
    script,
    (_, openingTag: string, closingTag: string) =>
      `${openingTag.replace(markerAttribute, "")}${importMap}${closingTag}`,
  );
}

export class ImportMapBuildOutput {
  readonly marker: string;
  readonly placeholder: string;

  constructor(private readonly fileName?: string) {
    this.marker = `vite-import-maps-${importMapBuildOutputId++}`;
    this.placeholder = JSON.stringify({
      imports: {},
      __vite_import_maps_placeholder__: this.marker,
    });
  }

  finalize(bundle: OutputBundle, store: VitePluginImportMapsStore): void {
    const htmlOutputs = Object.values(bundle).filter(
      (output) =>
        output.type === "asset" &&
        output.fileName.endsWith(".html") &&
        typeof output.source === "string" &&
        output.source.includes(this.marker),
    );
    const fileOutput = this.fileName ? bundle[this.fileName] : undefined;

    if (htmlOutputs.length === 0 && fileOutput?.type !== "asset") {
      return;
    }

    const importMap = store.getImportMapAsJson();
    const compactImportMap = JSON.stringify(importMap);

    for (const output of htmlOutputs) {
      const source = output.source as string;
      const finalized = finalizeHtmlImportMap(
        source,
        this.marker,
        compactImportMap,
      );

      if (finalized === source) {
        throw new Error(
          `Unable to finalize the import map in ${output.fileName}`,
        );
      }

      output.source = finalized;
    }

    if (fileOutput?.type === "asset") {
      fileOutput.source = JSON.stringify(importMap, null, 2);
    }
  }
}

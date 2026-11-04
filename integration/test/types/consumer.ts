/// <reference types="vite-import-maps/client" />

import viteImportMaps from "vite-import-maps";
import importMap, {
  importMapRaw,
  importMap as namedMap,
} from "virtual:importmap";
import type {
  DependencyIntegrityCheck,
  ImportMapScriptAttributes,
  ImportMapSignature,
  ImportMapTransformerFn,
  SharedDependencyConfig,
  SharedDependencyObjectConfig,
  VitePluginImportMapsConfig,
} from "vite-import-maps";

const integrity: DependencyIntegrityCheck = "sha384";
const entry: SharedDependencyObjectConfig = {
  name: "api",
  entry: "./api.ts",
  integrity,
};
const imports: SharedDependencyConfig = [entry, "react"];
const attributes: ImportMapScriptAttributes = {
  nonce: "nonce",
  id: "map",
  "data-owner": "host",
};
const transform: ImportMapTransformerFn = (map) => map;
const config: VitePluginImportMapsConfig = {
  imports,
  importMapScriptAttributes: attributes,
  importMapHtmlTransformer: transform,
};
viteImportMaps(config);

const map: ImportMapSignature = importMap;
const named: ImportMapSignature = namedMap;
const raw: string = importMapRaw;
const url: string | undefined = map.imports?.api;
const scopedUrl: string | undefined = named.scopes?.["/remote/"]?.api;
void [raw, url, scopedUrl];

// @ts-expect-error Import-map addresses must be strings.
const invalid: ImportMapSignature = { imports: { api: 42 } };
// @ts-expect-error A scope maps specifiers to addresses.
const invalidScope: ImportMapSignature = { scopes: { "/remote/": "./api.js" } };
// @ts-expect-error The plugin always injects an inline import-map script.
const invalidAttributes: ImportMapScriptAttributes = { src: "./map.json" };
void [invalid, invalidScope, invalidAttributes];

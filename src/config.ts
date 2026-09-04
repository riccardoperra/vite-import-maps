import type {
  RegisteredDependency,
  VitePluginImportMapsStore,
} from "./store.js";

export const PLUGIN_NAME = "vite-import-maps";

export function pluginName(name: string) {
  return `${PLUGIN_NAME}:${name}`;
}

export interface ImportMapSignature {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#imports
   */
  imports?: Record<string, string>;
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#integrity
   */
  integrity?: Record<string, string>;
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#scopes
   */
  scopes?: Record<string, Record<string, string>>;
}

export interface ImportMapScriptAttributes {
  /** Content Security Policy nonce for the injected inline script. */
  nonce?: string;
  /** DOM identifier for the injected inline script. */
  id?: string;
  [attribute: `data-${string}`]: string | undefined;
}

export type ImportMapTransformerFn = (
  importMap: ImportMapSignature,
  meta: {
    entries: Map<string, RegisteredDependency>;
    store: VitePluginImportMapsStore;
  },
) => ImportMapSignature;

export type DependencyIntegrityCheck = "sha256" | "sha384" | "sha512";

export interface SharedDependencyObjectConfig {
  /**
   * The name of the dependency that will be resolved
   */
  name: string;
  /**
   * Local path to the entry file, or the dependency name (e.g., react)
   */
  entry: string;
  /**
   * Enable integrity check for the dependency (only in build)
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#integrity_metadata_map
   */
  integrity?: boolean | DependencyIntegrityCheck;
}
export type SharedDependencyConfig = Array<
  string | SharedDependencyObjectConfig
>;

export interface VitePluginImportMapsConfig {
  /**
   * Dependencies shared by modules
   */
  imports: SharedDependencyConfig;
  /**
   * Directory where the shared chunks are stored
   *
   * @default ""
   */
  modulesOutDir?: string;
  /**
   * Default `integrity` value for entries.
   * Can be customized per dependency through {@link SharedDependencyObjectConfig#integrity}
   *
   * https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#integrity_metadata_map
   */
  integrity?: boolean | DependencyIntegrityCheck;
  /**
   * Enable logging
   */
  log?: boolean;
  /**
   * Whether to inject the import map in to the main HTML file. Defaults to true.
   *
   * For server-rendered HTML, disable this and render the script yourself.
   * Use `virtual:importmap` in development and emitted JSON from the client
   * build in production, after final chunk filenames have been generated.
   */
  injectImportMapsToHtml?: boolean;
  /** Attributes for the injected import-map script. Ignored when HTML injection is disabled. */
  importMapScriptAttributes?: ImportMapScriptAttributes;
  /**
   * Transform the complete resolved map for HTML, virtual-module, and JSON output.
   */
  importMapHtmlTransformer?: ImportMapTransformerFn;
  /**
   * Whether to generate an import file.
   *
   * If a string is provided, it will be used as the output file name. Default as 'import-map.json'.
   *
   * Output file will be generated in the root directory of your generated bundle and will be
   * available also in development mode via the Vite Dev Server.
   */
  outputAsFile?: boolean | string;
}

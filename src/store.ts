import * as path from "node:path/posix";
import {
  isLocalEntry,
  normalizeDependencyName,
  normalizePath,
} from "./utils.js";
import type {
  DependencyIntegrityCheck,
  ImportMapSignature,
  ImportMapTransformerFn,
  SharedDependencyConfig,
  VitePluginImportMapsConfig,
} from "./config.js";

export interface RegisteredDependency {
  packageName: string;
  url: string;
  integrity?: string;
}

export interface NormalizedDependencyInput {
  name: string;
  entry: string;
  localFile: boolean;
  integrity: DependencyIntegrityCheck | boolean;
}

export class VitePluginImportMapsStore {
  readonly defaultIntegrity: boolean | DependencyIntegrityCheck;
  readonly sharedDependencies: ReadonlyArray<NormalizedDependencyInput> = [];
  readonly modulesOutDir: string = "";
  readonly log: boolean;
  readonly importMapHtmlTransformer: ImportMapTransformerFn = (importMap) =>
    importMap;
  readonly importMapDependencies: Map<string, RegisteredDependency> = new Map();

  readonly inputs: Array<ImportMapBuildChunkEntrypoint> = [];
  private developmentResolver?: () => Promise<void>;

  setDevelopmentResolver(resolver: () => Promise<void>): void {
    this.developmentResolver = resolver;
  }

  async resolveDevelopmentDependencies(): Promise<void> {
    await this.developmentResolver?.();
  }

  constructor(options: VitePluginImportMapsConfig) {
    this.defaultIntegrity = options.integrity || false;
    this.sharedDependencies = [
      ...options.imports.map(this.normalizeDependencyInput),
    ];
    this.log = options.log || false;
    if (options.modulesOutDir) {
      this.modulesOutDir = options.modulesOutDir;
    }
    if (options.importMapHtmlTransformer) {
      this.importMapHtmlTransformer = options.importMapHtmlTransformer;
    }
  }

  private normalizeDependencyInput = (
    config: SharedDependencyConfig[number],
  ): NormalizedDependencyInput => {
    if (typeof config === "string") {
      return {
        name: config,
        entry: config,
        localFile: false,
        integrity: this.defaultIntegrity,
      };
    }
    const { name, entry: url, integrity } = config;
    return {
      name: name,
      entry: normalizePath(url),
      localFile: isLocalEntry(url),
      integrity: integrity ?? this.defaultIntegrity,
    };
  };

  clearDependencies(): void {
    this.importMapDependencies.clear();
  }

  addDependency(dependency: RegisteredDependency): void {
    this.importMapDependencies.set(dependency.packageName, dependency);
  }

  getNormalizedDependencyName(dependency: string): string {
    return normalizeDependencyName(dependency);
  }

  getEntrypointPath(entrypoint: string): string {
    return path.posix.join(this.modulesOutDir, entrypoint);
  }

  addInput(input: NormalizedDependencyInput): ImportMapBuildChunkEntrypoint {
    const dependency = input.name;
    if (
      this.inputs.some(
        (registered) => registered.originalDependencyName === dependency,
      )
    ) {
      throw new Error(`Duplicate import-map dependency: ${dependency}`);
    }

    const normalizedName = this.getNormalizedDependencyName(dependency);
    let normalizedDepName = normalizedName;
    let suffix = 1;
    while (
      this.inputs.some(
        (registered) =>
          registered.normalizedDependencyName === normalizedDepName,
      )
    ) {
      normalizedDepName = `${normalizedName}_${suffix++}`;
    }

    const entrypoint = this.getEntrypointPath(normalizedDepName);

    const meta = {
      originalDependencyName: dependency,
      entrypoint,
      normalizedDependencyName: normalizedDepName,
      idToResolve: input.entry,
      localFile: input.localFile,
      integrity: input.integrity,
    } satisfies ImportMapBuildChunkEntrypoint;

    this.inputs.push(meta);

    return meta;
  }

  getImportMapAsJson(): ImportMapSignature {
    const imports: Record<string, string> = Object.create(null);
    const integrity: Record<string, string> = Object.create(null);
    this.importMapDependencies.forEach((dep) => {
      imports[dep.packageName] = dep.url;
      if (dep.integrity) {
        integrity[dep.url] = dep.integrity;
      }
    });

    const importMap: ImportMapSignature = {
      imports,
    };
    if (Object.keys(integrity).length > 0) {
      importMap.integrity = integrity;
    }

    return this.importMapHtmlTransformer(importMap, {
      store: this,
      entries: this.importMapDependencies,
    });
  }
}

export interface ImportMapBuildChunkEntrypoint {
  originalDependencyName: string;
  normalizedDependencyName: string;
  entrypoint: string;
  idToResolve: string;
  localFile: boolean;
  integrity: DependencyIntegrityCheck | boolean;
}

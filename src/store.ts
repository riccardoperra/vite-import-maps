import path from "node:path";
import { normalizeDependencyName } from "./utils.js";
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
    entry: SharedDependencyConfig[number],
  ): NormalizedDependencyInput => {
    if (typeof entry === "string") {
      return {
        name: entry,
        entry: entry,
        localFile: false,
        integrity: this.defaultIntegrity,
      };
    }
    return {
      name: entry.name,
      entry: entry.entry,
      localFile: entry.entry.startsWith("./") || entry.entry.startsWith("../"),
      integrity: entry.integrity ?? this.defaultIntegrity,
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
    return path.join(this.modulesOutDir, entrypoint);
  }

  addInput(input: NormalizedDependencyInput): ImportMapBuildChunkEntrypoint {
    const dependency = input.name;
    const normalizedDepName = this.getNormalizedDependencyName(dependency);
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

  getImportMapAsJson(): Record<string, any> {
    const imports = {} as Record<string, string>;
    const integrity = {} as Record<string, string>;
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

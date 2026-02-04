/*
 * Copyright 2025 Riccardo Perra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from "node:path";
import { normalizeDependencyName } from "./utils.js";
import type {
  DependencyIntegrityCheck,
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
  #defaultIntegrity: boolean | DependencyIntegrityCheck;
  readonly sharedDependencies: ReadonlyArray<NormalizedDependencyInput> = [];
  readonly sharedOutDir: string = "";
  readonly log: boolean;
  readonly importMapHtmlTransformer: (
    imports: Record<string, any>,
    entries: Map<string, RegisteredDependency>,
  ) => Record<string, any> = (imports) => imports;
  readonly importMapDependencies: Map<string, RegisteredDependency> = new Map();

  readonly inputs: Array<ImportMapBuildChunkEntrypoint> = [];

  constructor(options: VitePluginImportMapsConfig) {
    this.#defaultIntegrity = options.integrity || false;
    this.sharedDependencies = [
      ...options.shared.map(this.normalizeDependencyInput),
    ];
    this.log = options.log || false;
    if (options.sharedOutDir) {
      this.sharedOutDir = options.sharedOutDir;
    }
    if (options.importMapHtmlTransformer) {
      this.importMapHtmlTransformer = options.importMapHtmlTransformer;
    }
  }

  private normalizeDependencyInput = (
    entry: SharedDependencyConfig[number],
  ): NormalizedDependencyInput => {
    if (typeof entry === "string") {
      return { name: entry, entry: entry, localFile: false, integrity: this.#defaultIntegrity };
    }
    return {
      name: entry.name,
      entry: entry.entry,
      localFile: entry.entry.startsWith("./") || entry.entry.startsWith("../"),
      integrity: entry.integrity ?? this.#defaultIntegrity,
    };
  }

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
    return path.join(this.sharedOutDir, entrypoint);
  }

  addInput(input: NormalizedDependencyInput) {
    const dependency = input.name;
    const normalizedDepName = this.getNormalizedDependencyName(dependency);
    const entrypoint = this.getEntrypointPath(normalizedDepName);

    const meta = {
      originalDependencyName: dependency,
      entrypoint,
      normalizedDependencyName: normalizedDepName,
      idToResolve: input.entry,
      localFile: input.localFile,
      integrity: input.integrity
    } satisfies ImportMapBuildChunkEntrypoint;

    this.inputs.push(meta);

    return meta;
  }

  getImportMapAsJson(): Record<string, any> {
    const imports = {} as Record<string, string>;
    this.importMapDependencies.forEach((dep) => {
      imports[dep.packageName] = dep.url;
    });

    const resolvedImports = this.importMapHtmlTransformer(
      imports,
      this.importMapDependencies
    );

    return {
      imports: resolvedImports
    }
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

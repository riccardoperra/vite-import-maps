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

import { buildWithInputOptions } from "./strategy/build-with-input-options.js";
import { buildWithVirtual } from "./strategy/build-virtual.js";
import type { Plugin } from "vite";
import type { ImportMapsBuildOptions } from "./config.js";
import type { VitePluginImportMapsStore } from "./store.js";

export function pluginImportMapsBuildEnv(
  store: VitePluginImportMapsStore,
  buildOptions: ImportMapsBuildOptions,
): Array<Plugin> {
  const plugins: Array<Plugin> = [];

  const resolvedBuildOptions: Required<ImportMapsBuildOptions> = {
    strategy: buildOptions.strategy ?? "virtual-modules",
  };

  for (const dep of store.sharedDependencies) {
    store.addInput(dep);
  }

  if (resolvedBuildOptions.strategy === "entry-as-input") {
    plugins.push(buildWithInputOptions(store));
  } else {
    plugins.push(...buildWithVirtual(store));
  }

  return plugins;
}

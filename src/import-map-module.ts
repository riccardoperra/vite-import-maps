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

import { pluginName } from "./config.js";
import type { VitePluginImportMapsStore } from "./store.js";
import type { Plugin } from "vite";

const virtualImportMapId = 'virtual:importmap';
const resolvedVirtualImportMapId = "\0" + virtualImportMapId;

export function pluginImportMapsAsModule(
  store: VitePluginImportMapsStore
): Plugin {
  const name = pluginName("virtual-module-import-map");

  return {
    name,
    resolveId(id) {
      if (id === virtualImportMapId) {
        return resolvedVirtualImportMapId;
      }
    },
    load(id) {
      if (id === resolvedVirtualImportMapId) {
        const content = JSON.stringify(store.getImportMapAsJson());
        return `
          export const importMapRaw = '${content}';
          export const importMap = ${content};
          export default importMap;
        `;
      }
    },
  };
}
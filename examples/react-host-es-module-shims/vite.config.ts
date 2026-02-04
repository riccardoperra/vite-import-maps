import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { vitePluginNativeImportMaps } from "../../src";

// https://vite.dev/config/
export default defineConfig({
  build: {
    manifest: true,
  },
  plugins: [
    vitePluginNativeImportMaps({
      shared: ['react'],
      outputAsFile: true
    }),
    react()
  ],
})

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.tsx',
      formats: ['es']
    },
    rolldownOptions: {
      external: ['solid-js', 'solid-js/web', 'statebuilder', 'solid-js/store'],
    }
  },
  plugins: [solid()],
})

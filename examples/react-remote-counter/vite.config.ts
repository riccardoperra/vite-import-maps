import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.tsx',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime'
      ],
    }
  },
  plugins: [react()],
})

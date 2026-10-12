import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The OpenSCAD worker lazy-loads the WebAssembly build, which needs ES module workers.
  worker: { format: 'es' },
  build: {
    // openscad-wasm embeds its ~10 MB binary in one chunk; it only loads inside the worker.
    chunkSizeWarningLimit: 15000,
  },
})

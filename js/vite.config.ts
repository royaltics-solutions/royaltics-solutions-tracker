// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs'
    },
    rollupOptions: {
      external: (id) => {
        // Mantener externos los módulos de Node.js para que se carguen dinámicamente
        return ['zlib', 'http', 'https', 'crypto'].includes(id);
      }
    }
  },
  plugins: [dts()],
  resolve: {
    conditions: ['browser', 'module', 'import', 'default']
  }
});
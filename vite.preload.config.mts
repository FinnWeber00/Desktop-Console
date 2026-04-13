import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/preload/index.ts',
      output: {
        format: 'cjs',
        inlineDynamicImports: true,
        entryFileNames: 'preload.js',
        chunkFileNames: 'preload-[name].js',
        assetFileNames: 'preload.[ext]',
      },
    },
  },
});

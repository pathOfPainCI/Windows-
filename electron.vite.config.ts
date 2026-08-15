import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const sharedAlias = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: { rollupOptions: { external: ['@nut-tree-fork/nut-js'] } }
  },
  preload: { resolve: { alias: sharedAlias } },
  renderer: {
    resolve: { alias: { ...sharedAlias, '@renderer': resolve('src/renderer/src') } },
    plugins: [react()]
  }
})

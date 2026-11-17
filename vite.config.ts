import { rmSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// Dev-server only (apply: 'serve'): the /editor write API for reviewing the imported vocabulary.
import vocabEditor from './scripts/vocab/editor-plugin.mjs'

/** Source-page scans are for the local editor only; never ship them in a build. */
const dropSourcePages = (): Plugin => ({
  name: 'drop-source-pages',
  apply: 'build',
  closeBundle() {
    rmSync(join(import.meta.dirname, 'dist', 'source-pages'), { recursive: true, force: true })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vocabEditor({ root: import.meta.dirname }), dropSourcePages()],
})

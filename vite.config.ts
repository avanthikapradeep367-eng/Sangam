import { rmSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
// Dev-server only (apply: 'serve'): the /editor write API for reviewing the imported vocabulary.
import vocabEditor from './scripts/vocab/editor-plugin.mjs'
// Server-side Azure endpoints (/api/translate, /api/speak, …). Production uses server/index.mjs.
import { createApi } from './server/api.mjs'

/** Source-page scans are for the local editor only; never ship them in a build. */
const dropSourcePages = (): Plugin => ({
  name: 'drop-source-pages',
  apply: 'build',
  closeBundle() {
    rmSync(join(import.meta.dirname, 'dist', 'source-pages'), { recursive: true, force: true })
  },
})

/**
 * Mounts /api on `vite` and `vite preview`. The Azure keys come from .env / the shell through
 * loadEnv with an empty prefix and stay in this Node process; only VITE_* variables ever reach
 * the browser bundle, and none are used for secrets.
 */
const azureApi = (env: Record<string, string>): Plugin => {
  const api = createApi({ ...process.env, ...env })
  return {
    name: 'azure-api',
    configureServer(server) { server.middlewares.use((req, res, next) => void api(req, res, next)) },
    configurePreviewServer(server) { server.middlewares.use((req, res, next) => void api(req, res, next)) },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), vocabEditor({ root: import.meta.dirname }), dropSourcePages(), azureApi(loadEnv(mode, import.meta.dirname, ''))],
}))

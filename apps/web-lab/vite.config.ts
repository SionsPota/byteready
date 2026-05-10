import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '')
  const labServerPort = env.LAB_SERVER_PORT ?? '8788'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: `http://localhost:${labServerPort}`,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  }
})

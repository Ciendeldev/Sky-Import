import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

/**
 * Next lee `.env.local` solo, pero las pruebas corren en otro proceso y no lo
 * ven. Sin esto, una prueba no puede saber si la tienda que está mirando tiene
 * base de datos detrás o está en modo degradado — y son dos comportamientos
 * distintos, los dos correctos, que hay que comprobar de forma distinta.
 *
 * Las variables ya presentes en el entorno mandan: así CI puede fijarlas sin
 * que un archivo local se las pise.
 */
function cargarEnvLocal() {
  if (!existsSync('.env.local')) return
  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte < 0) continue
    const clave = limpia.slice(0, corte).trim()
    if (process.env[clave] !== undefined) continue
    process.env[clave] = limpia.slice(corte + 1).trim()
  }
}

cargarEnvLocal()

/** ¿La tienda bajo prueba tiene Supabase configurado? */
export const CON_BASE =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})

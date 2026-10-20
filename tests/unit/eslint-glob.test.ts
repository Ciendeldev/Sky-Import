import { afterAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { isAbsolute, relative, resolve } from 'node:path'
import { ESLint } from 'eslint'

const require = createRequire(import.meta.url)
const { getRootDirs } = require('@next/eslint-plugin-next/dist/utils/get-root-dirs') as {
  getRootDirs: (context: { cwd: string; settings: { next?: { rootDir: unknown } } }) => string[]
}
const nextPlugin = require('@next/eslint-plugin-next')
const tmp = resolve('tmp')
mkdirSync(tmp, { recursive: true })
const fixture = mkdtempSync(resolve(tmp, 'lint-glob-'))
const root = fixture.replaceAll('\\', '/')
for (const app of ['store', 'admin']) {
  mkdirSync(`${fixture}/apps/${app}/pages`, { recursive: true })
  writeFileSync(`${fixture}/apps/${app}/pages/contact.jsx`, 'export default function Contact() { return null }')
}
writeFileSync(`${fixture}/apps/not-a-directory.txt`, 'fixture')
afterAll(() => {
  const inside = relative(tmp, fixture)
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) throw new Error('Carpeta de prueba fuera de tmp')
  rmSync(fixture, { recursive: true, force: true })
})

describe('compatibilidad del glob de ESLint Next sin braces', () => {
  it('conserva cwd cuando no se configura rootDir', () => {
    expect(getRootDirs({ cwd: fixture, settings: {} })).toEqual([fixture])
  })

  it.each([
    { rootDir: `${root}/apps/*` },
    { rootDir: `${root}/apps/{store,admin}` },
    { rootDir: `${fixture}\\apps\\*` },
    { rootDir: [`${root}/apps/store`, `${root}/apps/admin`] },
  ])('encuentra únicamente directorios para $rootDir', ({ rootDir }) => {
    expect(getRootDirs({ cwd: fixture, settings: { next: { rootDir } } }).sort())
      .toEqual([`${root}/apps/admin`, `${root}/apps/store`])
  })

  it('la regla de navegación detecta un enlace incorrecto con rootDir glob', async () => {
    const eslint = new ESLint({
      cwd: fixture,
      overrideConfigFile: true,
      overrideConfig: [{
        files: ['**/*.jsx'],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { '@next/next': nextPlugin },
        settings: { next: { rootDir: `${root}/apps/*` } },
        rules: { '@next/next/no-html-link-for-pages': 'error' },
      }],
    })
    const [invalid] = await eslint.lintText(
      'export default function Page() { return <a href="/contact">Contacto</a> }',
      { filePath: `${fixture}/check.jsx` },
    )
    expect(invalid?.messages.map(message => message.ruleId)).toContain('@next/next/no-html-link-for-pages')
    const [valid] = await eslint.lintText(
      'export default function Page() { return <a href="https://example.com">Externo</a> }',
      { filePath: `${fixture}/check.jsx` },
    )
    expect(valid?.errorCount).toBe(0)
  })
})

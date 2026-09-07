import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'next-env.d.ts',
      // Los worktrees aislados llevan una copia entera del proyecto, con su
      // propio `node_modules`. Sin esta línea, `npm run lint` los recorre y
      // devuelve miles de problemas que no son de este árbol.
      '.worktrees/**',
      '.img2threejs/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Intl',
          message:
            'El dinero y las fechas se formatean a mano (src/lib/money). Intl produce cadenas distintas en servidor y navegador y rompe la hidratación.',
        },
      ],
    },
  },
]

export default config

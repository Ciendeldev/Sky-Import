import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { makeT } from '@/lib/i18n/dictionary'

vi.mock('@/lib/i18n/context', () => ({ useI18n: () => ({ locale: 'es', t: makeT('es'), path: (route: string) => `/es${route}` }) }))
vi.mock('@/lib/catalog/context', () => ({ useCatalog: () => ({ products: [], fx: { PYG: 7400, BRL: 5.4 }, lowStockAt: 3 }) }))
import { HomeView } from '@/components/views/HomeView'

it('la portada sigue renderizando al desactivar el último producto', () => {
  const html = renderToStaticMarkup(createElement(HomeView))
  expect(html).toContain('/es/catalogo')
  expect(html).not.toContain('/es/producto/')
})

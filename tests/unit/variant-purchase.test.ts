import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCTS } from '@/lib/catalog/products'
import { makeT } from '@/lib/i18n/dictionary'
import type { Variant } from '@/lib/variants'

vi.mock('@/lib/i18n/context', () => ({ useI18n: () => ({ locale: 'es', t: makeT('es') }) }))
vi.mock('@/lib/catalog/context', () => ({ useCatalog: () => ({ fx: { PYG: 7400, BRL: 5.4 }, lowStockAt: 3 }) }))
import { BuyBox } from '@/components/product/BuyBox'

const variants: Variant[] = [
  { id: '1', sku: 'NEGRO-1TB', label: { es: 'Negro 1TB', pt: 'Preto 1TB' }, attributes: { Color: 'Negro', Capacidad: '1TB' }, units: 3, priceUsd: 120, imageUrl: null },
  { id: '2', sku: 'BLANCO-2TB', label: { es: 'Blanco 2TB', pt: 'Branco 2TB' }, attributes: { Color: 'Blanco', Capacidad: '2TB' }, units: 2, priceUsd: 200, imageUrl: null },
]
const render = (selection: Record<string, string>, options = variants) => renderToStaticMarkup(createElement(BuyBox, {
  product: { ...PRODUCTS[0]!, units: 8 }, variants: options, selection, onSelect: () => {},
}))

describe('comprar una variante', () => {
  it('una combinación inexistente no ofrece enlaces ni un botón de compra habilitado', () => {
    const html = render({ Color: 'Negro', Capacidad: '2TB' })
    expect(html).toContain('Combinación no disponible')
    expect(html).not.toContain('href=')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="agregar"/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-testid="comprar-whatsapp"/)
  })
  it('una combinación válida conserva la compra y su SKU', () => {
    const html = render({ Color: 'Blanco', Capacidad: '2TB' })
    expect(html).toContain('href=')
    expect(html).toContain('BLANCO-2TB')
    expect(html).not.toContain('Combinación no disponible')
  })
  it('un producto sin variantes conserva la compra normal', () => {
    expect(render({}, [])).toContain('href=')
    expect(render({}, [])).not.toContain('Combinación no disponible')
  })
})

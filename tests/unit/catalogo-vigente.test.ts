import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '@/lib/catalog/products'
import {
  lowStockFrom,
  productFromRow,
  ratesFrom,
  snapshotFrom,
  type StoreProductRow,
} from '@/lib/catalog/fromRows'
import { buildCatalog, type CatalogSnapshot } from '@/lib/catalog/live'
import { resolveLines } from '@/lib/cart'
import { placedFrom } from '@/lib/checkout'

/**
 * El defecto que estas pruebas cierran: el panel cambiaba el precio en la base,
 * `place_order` cobraba el de la base y la vitrina seguía mostrando el del
 * archivo. Cada prueba fija una de las reglas que impiden volver a eso.
 */

const RESPALDO: CatalogSnapshot = {
  products: PRODUCTS,
  fx: { PYG: 7400, BRL: 5.4 },
  lowStockAt: 3,
  origin: 'archivo',
}

const gpu = PRODUCTS.find((product) => product.slug === 'geforce-rtx-5080-16gb')!

/** Una fila como la que devolvería la base para una pieza del archivo. */
function filaDe(slug: string, cambios: Partial<StoreProductRow> = {}): StoreProductRow {
  const product = PRODUCTS.find((item) => item.slug === slug)!
  return {
    slug: product.slug,
    ref: product.ref,
    name: product.name,
    brand: product.brand,
    model: product.model,
    category_slug: product.category,
    price_usd: product.priceUsd,
    list_price_usd: product.listPriceUsd ?? null,
    units: product.units,
    arrived_recently: product.arrivedRecently ?? false,
    featured: product.featured ?? false,
    blurb_es: product.blurb.es,
    blurb_pt: product.blurb.pt,
    specs: product.specs,
    compat: product.compat,
    render: product.render,
    ...cambios,
  }
}

describe('lo que edita el panel sale de la base', () => {
  it('precio, unidades y nombre de la base pisan a los del archivo', () => {
    const fila = filaDe(gpu.slug, { price_usd: 1999, units: 1, name: 'RTX 5080 editada' })
    const product = productFromRow(fila, gpu)!
    expect(product.priceUsd).toBe(1999)
    expect(product.units).toBe(1)
    expect(product.name).toBe('RTX 5080 editada')
  })

  it('sin precio anterior en la base no queda oferta, aunque el archivo tuviera una', () => {
    const conOferta = PRODUCTS.find((item) => item.listPriceUsd)!
    const product = productFromRow(filaDe(conOferta.slug, { list_price_usd: null }), conOferta)!
    expect(product.listPriceUsd).toBeUndefined()
  })

  it('PostgREST puede devolver numeric como texto: el precio se lee igual', () => {
    const fila = filaDe(gpu.slug, { price_usd: '1724.00' as unknown as number })
    expect(productFromRow(fila, gpu)!.priceUsd).toBe(1724)
  })

  it('una fila con precio imposible no se vende', () => {
    expect(productFromRow(filaDe(gpu.slug, { price_usd: -1 }), gpu)).toBeNull()
  })
})

describe('la ficha técnica sale del archivo', () => {
  it('compatibilidad, dibujo y especificaciones del archivo mandan sobre la copia importada', () => {
    const fila = filaDe(gpu.slug, {
      compat: { kind: 'accessory' },
      render: { shape: 'fan', accent: '#000000', seed: 1 },
      specs: [],
    })
    const product = productFromRow(fila, gpu)!
    expect(product.compat).toEqual(gpu.compat)
    expect(product.render).toEqual(gpu.render)
    expect(product.specs).toEqual(gpu.specs)
  })

  it('una pieza creada desde el panel se vende como accesorio con el dibujo de su categoría', () => {
    const fila = {
      ...filaDe(gpu.slug),
      slug: 'pieza-nueva-del-panel',
      ref: 'SI-NEW-0001',
      compat: {} as StoreProductRow['compat'],
      render: {} as StoreProductRow['render'],
      specs: [],
    }
    const product = productFromRow(fila, undefined)!
    expect(product.compat.kind).toBe('accessory')
    expect(product.render.shape).toBe('gpu')
    // Mismo slug, mismo dibujo: la semilla no puede ser aleatoria.
    expect(productFromRow(fila, undefined)!.render.seed).toBe(product.render.seed)
  })
})

describe('la foto del catálogo', () => {
  it('solo trae lo que la base devolvió: una pieza desactivada desaparece de la vitrina', () => {
    const filas = PRODUCTS.filter((item) => item.slug !== gpu.slug).map((item) => filaDe(item.slug))
    const foto = snapshotFrom(filas, [], RESPALDO)
    expect(foto.origin).toBe('base')
    expect(foto.products.some((item) => item.slug === gpu.slug)).toBe(false)
    expect(foto.products).toHaveLength(PRODUCTS.length - 1)
  })

  it('conserva el orden del archivo aunque la base devuelva otro, y pone las nuevas al final', () => {
    const filas = [
      { ...filaDe(gpu.slug), slug: 'pieza-nueva-del-panel' },
      ...PRODUCTS.map((item) => filaDe(item.slug)).reverse(),
    ]
    const slugs = snapshotFrom(filas, [], RESPALDO).products.map((item) => item.slug)
    expect(slugs.slice(0, PRODUCTS.length)).toEqual(PRODUCTS.map((item) => item.slug))
    expect(slugs.at(-1)).toBe('pieza-nueva-del-panel')
  })

  it('desactivar el último producto no vuelve a publicar el catálogo de respaldo', () => {
    expect(snapshotFrom([], [], RESPALDO).products).toEqual([])
    expect(snapshotFrom([], [], RESPALDO).origin).toBe('base')
  })

  it('sin respuesta de la base conserva el respaldo', () => {
    expect(snapshotFrom(null, null, RESPALDO).origin).toBe('archivo')
  })

  it('toma la tasa y el umbral de la base', () => {
    const foto = snapshotFrom(
      [filaDe(gpu.slug)],
      [
        { key: 'fx', value: { PYG: 7650, BRL: 5.39, reference: '2026-09' } },
        { key: 'rules', value: { lowStockAt: 5 } },
      ],
      RESPALDO,
    )
    expect(foto.fx).toEqual({ PYG: 7650, BRL: 5.39 })
    expect(foto.lowStockAt).toBe(5)
  })

  it('una tasa mal tipeada en la base no llega a la vitrina', () => {
    // «7.400» guardado como 7.4: el mismo error que el panel ya rechaza.
    expect(ratesFrom({ PYG: 7.4, BRL: 540 }, RESPALDO.fx)).toEqual(RESPALDO.fx)
    expect(lowStockFrom({ lowStockAt: -2 }, 3)).toBe(3)
    expect(lowStockFrom(null, 3)).toBe(3)
  })
})

describe('el carrito cobra lo que muestra la foto vigente', () => {
  it('un cambio de precio en la base cambia el total del carrito', () => {
    const filas = PRODUCTS.map((item) =>
      item.slug === gpu.slug ? filaDe(item.slug, { price_usd: 1500 }) : filaDe(item.slug),
    )
    const catalog = buildCatalog(snapshotFrom(filas, [], RESPALDO))
    const [linea] = resolveLines([{ slug: gpu.slug, qty: 2 }], catalog)
    expect(linea?.unitPriceUsd).toBe(1500)
    expect(linea?.lineTotalUsd).toBe(3000)
  })

  it('los extremos del filtro de precio salen de los precios vigentes', () => {
    const filas = PRODUCTS.map((item) =>
      item.slug === gpu.slug ? filaDe(item.slug, { price_usd: 9999 }) : filaDe(item.slug),
    )
    expect(buildCatalog(snapshotFrom(filas, [], RESPALDO)).priceBounds.max).toBe(9999)
  })
})

describe('el mensaje copia lo que grabó el pedido', () => {
  it('lee líneas, totales y tasa de la respuesta de place_order', () => {
    const placed = placedFrom({
      ok: true,
      order_number: 'SI-1011',
      subtotal_usd: 109,
      discount_usd: 0,
      shipping_usd: 0,
      total_usd: 109,
      total_pyg: 807000,
      fx_pyg: 7400,
      lines: [
        { sku: 'SI-ACC-0902', name: 'Kryonaut 1 g', variant_label: '', qty: 2, unit_price_usd: 12, subtotal_usd: 24 },
        { sku: 'SI-PSU-0602', name: 'RM750e 750 W', variant_label: '', qty: 1, unit_price_usd: 85, subtotal_usd: 85 },
      ],
    })
    expect(placed?.totalUsd).toBe(109)
    expect(placed?.fxPyg).toBe(7400)
    expect(placed?.lines.map((line) => line.sku)).toEqual(['SI-ACC-0902', 'SI-PSU-0602'])
  })

  it('con la función anterior, sin líneas, no inventa nada y deja el mensaje a la página', () => {
    expect(placedFrom({ ok: true, order_number: 'SI-1', total_usd: 10, fx_pyg: 7400 })).toBeNull()
    expect(placedFrom(null)).toBeNull()
  })
})

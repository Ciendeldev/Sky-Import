import { CATEGORY_META } from './categories'
import { CATEGORIES, type CategorySlug, type Compat, type Product, type RenderSpec } from './types'
import type { CatalogSnapshot, Rates } from './live'
import type { ProductRow } from '@/lib/supabase/types'

/**
 * DE LA BASE A LA VITRINA
 *
 * Funciones puras: reciben filas y devuelven la foto del catálogo. Viven
 * separadas del cargador para poder probarlas sin red y sin `server-only`.
 *
 * LA REGLA DE PRECEDENCIA, que es lo único que hay que entender de este archivo:
 *
 *   · Lo que el panel permite editar —precio, precio anterior, unidades,
 *     nombre, código, marca, modelo, categoría, descripción, destacado y
 *     recién llegado— sale de la BASE. Es lo que el operador decidió, y es lo
 *     que `place_order` cobra.
 *   · La ficha técnica —especificaciones, compatibilidad y dibujo— sale del
 *     ARCHIVO cuando la pieza existe ahí. El panel no la edita, y la copia de
 *     la base es la que se importó en su día: si alguien corrige un milímetro
 *     en `products.ts`, esa corrección tiene que llegar al configurador sin
 *     reimportar nada.
 *   · Una pieza creada desde el panel no está en el archivo: usa lo que tenga
 *     la base y, si no tiene ficha, sale como accesorio con el dibujo de su
 *     categoría. Se vende igual; lo que no hace es entrar al configurador
 *     hasta tener compatibilidad declarada.
 */

/** Las columnas que la vitrina lee. Ni costos, ni mínimos, ni fechas. */
export const STORE_PRODUCT_COLUMNS =
  'slug, ref, name, brand, model, category_slug, price_usd, list_price_usd, units, arrived_recently, featured, blurb_es, blurb_pt, specs, compat, render' as const

export type StoreProductRow = Pick<
  ProductRow,
  | 'slug'
  | 'ref'
  | 'name'
  | 'brand'
  | 'model'
  | 'category_slug'
  | 'price_usd'
  | 'list_price_usd'
  | 'units'
  | 'arrived_recently'
  | 'featured'
  | 'blurb_es'
  | 'blurb_pt'
  | 'specs'
  | 'compat'
  | 'render'
>

const COMPAT_KINDS: ReadonlySet<string> = new Set([
  'gpu',
  'cpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'cooling',
  'case',
  'accessory',
])

const RENDER_SHAPES: ReadonlySet<string> = new Set([
  'gpu',
  'cpu',
  'motherboard',
  'ram',
  'ssd-m2',
  'ssd-sata',
  'psu',
  'air-cooler',
  'aio-cooler',
  'case',
  'fan',
  'paste',
  'accessory',
])

/** El cian de la casa: el acento que lleva una pieza sin dibujo propio. */
const SKY = '#55C8F5'

function isCategory(value: string): value is CategorySlug {
  return (CATEGORIES as readonly string[]).includes(value)
}

function isCompat(value: unknown): value is Compat {
  return (
    typeof value === 'object' &&
    value !== null &&
    COMPAT_KINDS.has(String((value as { kind?: unknown }).kind))
  )
}

function isRender(value: unknown): value is RenderSpec {
  if (typeof value !== 'object' || value === null) return false
  const render = value as Partial<RenderSpec>
  return (
    RENDER_SHAPES.has(String(render.shape)) &&
    typeof render.accent === 'string' &&
    typeof render.seed === 'number'
  )
}

/** Semilla estable a partir del slug: el mismo producto, el mismo dibujo. */
function seedOf(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) % 9973
  return hash
}

const text = (value: string | null | undefined): string => (value ?? '').trim()

/**
 * Una fila de la base, convertida en producto de vitrina.
 * Devuelve `null` si la fila no se puede vender tal como está.
 */
export function productFromRow(row: StoreProductRow, base: Product | undefined): Product | null {
  const priceUsd = Number(row.price_usd)
  if (!text(row.slug) || !Number.isFinite(priceUsd) || priceUsd < 0) return null

  const category = isCategory(row.category_slug)
    ? row.category_slug
    : (base?.category ?? 'accesorios')
  const listPriceUsd = row.list_price_usd === null ? Number.NaN : Number(row.list_price_usd)
  const blurbEs = text(row.blurb_es) || base?.blurb.es || ''

  return {
    slug: row.slug,
    ref: text(row.ref) || base?.ref || row.slug,
    name: text(row.name) || base?.name || row.slug,
    brand: text(row.brand) || base?.brand || '',
    model: text(row.model) || base?.model || '',
    category,
    priceUsd,
    // Sin precio anterior en la base, no hay oferta: el operador la quitó.
    ...(Number.isFinite(listPriceUsd) && listPriceUsd > 0 ? { listPriceUsd } : {}),
    units: Math.max(0, Math.floor(Number(row.units) || 0)),
    ...(row.arrived_recently ? { arrivedRecently: true } : {}),
    ...(row.featured ? { featured: true } : {}),
    blurb: { es: blurbEs, pt: text(row.blurb_pt) || base?.blurb.pt || blurbEs },
    specs: base?.specs ?? (Array.isArray(row.specs) ? row.specs : []),
    compat: base?.compat ?? (isCompat(row.compat) ? row.compat : { kind: 'accessory' }),
    render:
      base?.render ??
      (isRender(row.render)
        ? row.render
        : { shape: CATEGORY_META[category].shape, accent: SKY, seed: seedOf(row.slug) }),
  }
}

/**
 * Tasas de la base, con los mismos límites que valida el panel al guardarlas.
 * Una tasa fuera de rango no es un dato: es un error de tipeo, y se ignora.
 */
export function ratesFrom(value: unknown, fallback: Rates): Rates {
  const fx = (typeof value === 'object' && value !== null ? value : {}) as Partial<Rates>
  const pyg = Number(fx.PYG)
  const brl = Number(fx.BRL)
  return {
    PYG: Number.isFinite(pyg) && pyg >= 1000 && pyg <= 20000 ? pyg : fallback.PYG,
    BRL: Number.isFinite(brl) && brl >= 1 && brl <= 50 ? brl : fallback.BRL,
  }
}

export function lowStockFrom(value: unknown, fallback: number): number {
  const rules = (typeof value === 'object' && value !== null ? value : {}) as {
    lowStockAt?: unknown
  }
  const umbral = Number(rules.lowStockAt)
  return Number.isInteger(umbral) && umbral >= 0 && umbral <= 1000 ? umbral : fallback
}

/**
 * La foto del catálogo a partir de lo que devolvió la base.
 *
 * Si la base no devolvió ningún producto vendible se usa el archivo entero.
 * Pasa con una base recién creada, antes de importar el catálogo desde el
 * panel: una vitrina vacía no le sirve a nadie, y la venta por WhatsApp
 * funciona igual aunque el pedido no llegue a registrarse.
 */
export function snapshotFrom(
  rows: StoreProductRow[] | null,
  settings: Array<{ key: string; value: unknown }> | null,
  fallback: CatalogSnapshot,
): CatalogSnapshot {
  const base = new Map(fallback.products.map((product) => [product.slug, product]))
  const orden = new Map(fallback.products.map((product, i) => [product.slug, i]))

  const products = (rows ?? [])
    .flatMap((row) => {
      const product = productFromRow(row, base.get(row.slug))
      return product ? [product] : []
    })
    // Las piezas del archivo conservan su orden editorial; las creadas desde
    // el panel van detrás, en el orden en que llegaron.
    .sort(
      (a, b) =>
        (orden.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
        (orden.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
    )

  const ajustes = new Map((settings ?? []).map((row) => [row.key, row.value]))
  const conBase = products.length > 0

  return {
    products: conBase ? products : fallback.products,
    fx: ratesFrom(ajustes.get('fx'), fallback.fx),
    lowStockAt: lowStockFrom(ajustes.get('rules'), fallback.lowStockAt),
    origin: conBase ? 'base' : 'archivo',
  }
}

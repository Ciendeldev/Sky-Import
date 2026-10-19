import type { Product } from './types'

/**
 * EL CATÁLOGO VIGENTE
 *
 * La tienda tenía dos orígenes de precio que no se hablaban: la vitrina leía
 * `products.ts` y el panel editaba la base, que es de donde `place_order`
 * cobra. Cambiar un precio desde el panel dejaba a la web mostrando el viejo
 * mientras el pedido registraba el nuevo. Ver `docs/adr/012-catalogo-vigente.md`.
 *
 * Ahora la vitrina recibe una FOTO del catálogo leída en el servidor —de la
 * base cuando responde, del archivo cuando no— y todo precio, stock y tasa
 * que se pinta sale de esa foto. Este módulo define su forma y no importa el
 * archivo del catálogo: si lo hiciera, los 37 productos volverían a viajar
 * dentro del JavaScript del navegador.
 */

/** Guaraníes y reales por dólar. */
export interface Rates {
  PYG: number
  BRL: number
}

export interface CatalogSnapshot {
  /** Solo lo que se puede vender: los productos desactivados no llegan. */
  products: Product[]
  fx: Rates
  /** Umbral de «últimas unidades». */
  lowStockAt: number
  /** De dónde salió la foto. Sirve para diagnosticar, no se muestra. */
  origin: 'base' | 'archivo'
}

export interface Catalog extends CatalogSnapshot {
  bySlug: ReadonlyMap<string, Product>
  brands: string[]
  /** Extremos del filtro de precio, derivados de los precios vigentes. */
  priceBounds: { min: number; max: number }
}

export function buildCatalog(snapshot: CatalogSnapshot): Catalog {
  const precios = snapshot.products.map((product) => product.priceUsd)
  return {
    ...snapshot,
    bySlug: new Map(snapshot.products.map((product) => [product.slug, product])),
    brands: Array.from(new Set(snapshot.products.map((product) => product.brand))).sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
    priceBounds: {
      min: precios.length > 0 ? Math.min(...precios) : 0,
      max: precios.length > 0 ? Math.max(...precios) : 0,
    },
  }
}

/**
 * Registro del navegador.
 *
 * Los almacenes del carrito y del armado no son componentes y no pueden leer
 * un contexto de React, pero necesitan el stock para no dejar pedir de más.
 * El proveedor registra acá la misma foto que reparte por contexto.
 *
 * Solo se escribe desde un efecto, así que en el servidor queda siempre vacío:
 * ahí el módulo lo comparten todas las peticiones y no puede guardar nada.
 */
let vigente: Catalog | null = null

export function registerCatalog(catalog: Catalog | null): void {
  vigente = catalog
}

export function currentCatalog(): Catalog | null {
  return vigente
}

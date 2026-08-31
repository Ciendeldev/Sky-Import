/**
 * VARIANTES EN EL CLIENTE
 *
 * La forma en que una variante viaja por la tienda: del selector de la ficha al
 * carrito, del carrito al checkout y del checkout al mensaje de WhatsApp.
 *
 * Es un tipo aparte y no el `VariantRow` de la base a propósito: al carrito solo
 * le hace falta lo que se imprime y lo que se cobra. Fechas, orden y banderas de
 * administración no tienen por qué llegar al navegador de nadie.
 */

import type { Locale } from '@/lib/i18n/locales'
import type { VariantRow } from '@/lib/supabase/types'

export interface Variant {
  id: string
  sku: string
  label: { es: string; pt: string }
  /** Ejes de esta variante: capacidad, color, velocidad… */
  attributes: Record<string, string>
  /** `null` = hereda el precio del producto. */
  priceUsd: number | null
  units: number
  imageUrl: string | null
}

export function toVariant(row: VariantRow): Variant {
  return {
    id: row.id,
    sku: row.sku,
    label: { es: row.label_es, pt: row.label_pt || row.label_es },
    attributes: row.attributes ?? {},
    priceUsd: row.price_usd === null ? null : Number(row.price_usd),
    units: row.units,
    imageUrl: row.image_url,
  }
}

/** Precio efectivo: el de la variante si lo tiene, y el del producto si no. */
export function priceOf(variant: Variant | null, productPriceUsd: number): number {
  return variant?.priceUsd ?? productPriceUsd
}

/** Stock efectivo. Sin variante elegida, manda el del producto. */
export function unitsOf(variant: Variant | null, productUnits: number): number {
  return variant ? variant.units : productUnits
}

/** SKU efectivo: el de la variante, o el código de referencia del producto. */
export function skuOf(variant: Variant | null, productRef: string): string {
  return variant?.sku ?? productRef
}

export function labelOf(variant: Variant | null, locale: Locale): string {
  return variant ? variant.label[locale] : ''
}

/**
 * Los ejes agrupados, en el orden en que aparecen.
 *
 * Un producto puede variar por más de una cosa a la vez —capacidad y color, por
 * ejemplo— y el selector necesita una fila por eje. Se derivan de las variantes
 * en lugar de declararse aparte: así no puede existir un eje sin variantes que
 * lo usen.
 */
export interface VariantAxis {
  name: string
  values: string[]
}

export function axesOf(variants: Variant[]): VariantAxis[] {
  const orden: string[] = []
  const valores = new Map<string, string[]>()

  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.attributes)) {
      if (!valores.has(name)) {
        valores.set(name, [])
        orden.push(name)
      }
      const lista = valores.get(name)!
      if (!lista.includes(value)) lista.push(value)
    }
  }

  return orden.map((name) => ({ name, values: valores.get(name) ?? [] }))
}

/** La primera variante que cumple con todos los ejes elegidos. */
export function matchVariant(
  variants: Variant[],
  selection: Record<string, string>,
): Variant | null {
  const entradas = Object.entries(selection)
  return (
    variants.find((variant) =>
      entradas.every(([name, value]) => variant.attributes[name] === value),
    ) ?? null
  )
}

/**
 * Selección inicial: la primera variante con stock, o la primera de la lista si
 * están todas agotadas. Nunca se abre la ficha con una variante agotada elegida
 * habiendo otra disponible.
 */
export function defaultSelection(variants: Variant[]): Record<string, string> {
  const preferida = variants.find((v) => v.units > 0) ?? variants[0]
  return preferida ? { ...preferida.attributes } : {}
}

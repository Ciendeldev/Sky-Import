'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRODUCT_BY_SLUG } from '@/lib/catalog/products'
import { RULES } from '@/config/site'
import type { Product } from '@/lib/catalog/types'
import type { Variant } from '@/lib/variants'

/**
 * EL CARRITO
 *
 * Guarda lo mínimo: qué pieza, qué variante y cuántas. El precio, el nombre y
 * el stock se releen del catálogo al mostrar, así que un carrito de hace una
 * semana nunca enseña un precio que ya no existe.
 *
 * La variante viaja como una copia del dato mínimo (`variant`), no como una
 * referencia: si el operador borra una variante del panel, la línea del carrito
 * tiene que poder seguir mostrándose y avisar, en vez de desaparecer sin
 * explicación. Lo que sí se revalida contra la base es el precio y el stock,
 * en el momento de registrar el pedido.
 */

export interface CartLine {
  slug: string
  qty: number
  /** SKU de la variante elegida. Ausente = la pieza no tiene variantes. */
  variantSku?: string
  /** Copia mínima de la variante, para poder pintar la línea sin consultar. */
  variant?: Pick<Variant, 'sku' | 'label' | 'priceUsd' | 'attributes'>
}

export interface CartLineResolved extends CartLine {
  product: Product
  /** Tope real de unidades: no se puede pedir más de lo configurado. */
  max: number
  /** Precio unitario efectivo: el de la variante si lo tiene. */
  unitPriceUsd: number
  lineTotalUsd: number
}

interface CartState {
  lines: CartLine[]
  /** Compuerta de hidratación: primero un marcador neutro, después el dato. */
  hydrated: boolean
  /** Última línea quitada, para poder deshacer sin perder la posición. */
  lastRemoved: { line: CartLine; index: number } | null
  add: (slug: string, qty?: number, variant?: CartLine['variant']) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  undoRemove: () => void
  clear: () => void
  markHydrated: () => void
}

/**
 * Clave de una línea. Dos variantes de la misma pieza son dos líneas distintas,
 * así que la clave no puede ser solo el slug.
 */
export function lineKey(line: Pick<CartLine, 'slug' | 'variantSku'>): string {
  return line.variantSku ? `${line.slug}::${line.variantSku}` : line.slug
}

function clampQty(slug: string, qty: number, max?: number): number {
  const product = PRODUCT_BY_SLUG.get(slug)
  const tope = max ?? (product ? Math.max(0, product.units) : 0)
  return Math.max(0, Math.min(qty, tope))
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,
      lastRemoved: null,

      add: (slug, qty = 1, variant) => {
        if (!PRODUCT_BY_SLUG.has(slug)) return
        const lines = get().lines
        const key = lineKey({ slug, variantSku: variant?.sku })
        const existing = lines.find((l) => lineKey(l) === key)
        const nextQty = clampQty(slug, (existing?.qty ?? 0) + qty)
        if (nextQty === 0) return
        set({
          lines: existing
            ? lines.map((l) => (lineKey(l) === key ? { ...l, qty: nextQty } : l))
            : [...lines, { slug, qty: nextQty, variantSku: variant?.sku, variant }],
          lastRemoved: null,
        })
      },

      setQty: (key, qty) => {
        const line = get().lines.find((l) => lineKey(l) === key)
        if (!line) return
        const next = clampQty(line.slug, qty)
        if (next === 0) {
          get().remove(key)
          return
        }
        set({ lines: get().lines.map((l) => (lineKey(l) === key ? { ...l, qty: next } : l)) })
      },

      remove: (key) => {
        const lines = get().lines
        const index = lines.findIndex((l) => lineKey(l) === key)
        if (index < 0) return
        const line = lines[index]
        if (!line) return
        set({
          lines: lines.filter((l) => lineKey(l) !== key),
          lastRemoved: { line, index },
        })
      },

      undoRemove: () => {
        const removed = get().lastRemoved
        if (!removed) return
        const lines = [...get().lines]
        lines.splice(Math.min(removed.index, lines.length), 0, removed.line)
        set({ lines, lastRemoved: null })
      },

      clear: () => set({ lines: [], lastRemoved: null }),

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      // v2: las líneas ahora pueden llevar variante. Un carrito v1 sigue siendo
      // legible —`variantSku` es opcional—, así que no hace falta migración.
      name: 'sky-import:cart:v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      /**
       * Saneo al rehidratar: si un producto desapareció del catálogo o su cantidad
       * quedó por encima de las unidades configuradas, la línea se corrige en vez
       * de arrastrar un dato imposible.
       */
      merge: (persisted, current) => {
        const raw = (persisted as { lines?: unknown } | undefined)?.lines
        const lines = Array.isArray(raw)
          ? raw
              .filter(
                (l): l is CartLine =>
                  typeof l === 'object' &&
                  l !== null &&
                  typeof (l as CartLine).slug === 'string' &&
                  typeof (l as CartLine).qty === 'number',
              )
              .map((l) => ({
                slug: l.slug,
                qty: clampQty(l.slug, Math.floor(l.qty)),
                ...(l.variantSku ? { variantSku: l.variantSku, variant: l.variant } : {}),
              }))
              .filter((l) => l.qty > 0)
          : []
        return { ...current, lines }
      },
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    },
  ),
)

// ─────────────────────────────────────────────────────── selectores derivados

export function resolveLines(lines: CartLine[]): CartLineResolved[] {
  return lines.flatMap((line) => {
    const product = PRODUCT_BY_SLUG.get(line.slug)
    if (!product) return []
    // El precio de la variante manda; si no tiene, hereda el de la pieza.
    const unitPriceUsd = line.variant?.priceUsd ?? product.priceUsd
    return [
      {
        ...line,
        product,
        max: product.units,
        unitPriceUsd,
        lineTotalUsd: unitPriceUsd * line.qty,
      },
    ]
  })
}

export interface CartTotals {
  count: number
  subtotalUsd: number
  shippingUsd: number
  totalUsd: number
  /** Cuánto falta en USD para el envío bonificado; `0` si ya aplica. */
  toFreeShippingUsd: number
}

export function totalsOf(resolved: CartLineResolved[]): CartTotals {
  const subtotalUsd = resolved.reduce((sum, l) => sum + l.lineTotalUsd, 0)
  const count = resolved.reduce((sum, l) => sum + l.qty, 0)
  const qualifies = subtotalUsd >= RULES.freeShippingUsd
  const shippingUsd = count === 0 || qualifies ? 0 : RULES.shippingUsd
  return {
    count,
    subtotalUsd,
    shippingUsd,
    totalUsd: subtotalUsd + shippingUsd,
    toFreeShippingUsd: qualifies ? 0 : Math.max(0, RULES.freeShippingUsd - subtotalUsd),
  }
}

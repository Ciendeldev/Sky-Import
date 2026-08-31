'use client'

import { useState } from 'react'
import { AddToCart } from '@/components/product/AddToCart'
import { VariantPicker } from '@/components/product/VariantPicker'
import { StickyBuyBar } from '@/components/product/StickyBuyBar'
import { CtaBody } from '@/components/ui/Cta'
import { useI18n } from '@/lib/i18n/context'
import { availabilityOf, type Product } from '@/lib/catalog/types'
import { RULES, hasWhatsapp } from '@/config/site'
import { productMessage, whatsappUrl } from '@/lib/whatsapp'
import {
  defaultSelection,
  matchVariant,
  priceOf,
  skuOf,
  unitsOf,
  type Variant,
} from '@/lib/variants'

/**
 * EL BLOQUE DE COMPRA
 *
 * La acción principal es **comprar por WhatsApp**: se salta el carrito y abre
 * la conversación con la pieza, la cantidad y el precio ya escritos. Es como se
 * cierra de verdad una venta acá, así que es la que manda visualmente.
 *
 * «Agregar al carrito» queda como acción secundaria, para quien va a llevar más
 * de una pieza. Es una jerarquía, no una preferencia: el que compra una sola
 * cosa no tiene por qué pasar por un carrito.
 *
 * Al cambiar de variante cambian a la vez el SKU, el precio, el stock y —si la
 * variante trae imagen propia— la foto. Eso último lo resuelve el padre, que es
 * quien tiene la galería: acá se avisa con `onVariantChange`.
 */
export function BuyBox({
  product,
  variants = [],
  onVariantChange,
}: {
  product: Product
  variants?: Variant[]
  onVariantChange?: (variant: Variant | null) => void
}) {
  const { t, locale } = useI18n()
  const [qty, setQty] = useState(1)
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    defaultSelection(variants),
  )

  const variant = variants.length > 0 ? matchVariant(variants, selection) : null
  const units = unitsOf(variant, product.units)
  const price = priceOf(variant, product.priceUsd)
  const sku = skuOf(variant, product.ref)

  // La disponibilidad se deriva del stock efectivo, que con variantes es el de
  // la variante elegida y no el del producto.
  const availability = availabilityOf({ ...product, units }, RULES.lowStockAt)
  const soldOut = availability === 'agotado'

  // No se puede pedir más de lo que hay. Si la variante elegida tiene menos
  // stock que la anterior, la cantidad se recorta sola.
  const cantidad = Math.min(qty, Math.max(1, units))

  function elegir(axis: string, value: string) {
    const siguiente = { ...selection, [axis]: value }
    setSelection(siguiente)
    setQty(1)
    onVariantChange?.(matchVariant(variants, siguiente))
  }

  const mensaje = productMessage({
    name: product.name,
    sku,
    slug: product.slug,
    qty: cantidad,
    unitPriceUsd: price,
    variantLabel: variant ? variant.label[locale] : undefined,
    locale,
  })

  return (
    <div className="mt-8">
      {variants.length > 0 ? (
        <VariantPicker variants={variants} selection={selection} onSelect={elegir} />
      ) : null}

      {!soldOut ? (
        <div className="mt-7 flex items-center gap-4">
          <span className="u-label">{t('product.qty')}</span>
          <div className="flex items-center border border-rule rounded-part">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={cantidad <= 1}
              aria-label={t('product.decrease')}
              className="grid size-11 place-items-center text-fg-mid transition-colors hover:text-fg disabled:opacity-35"
            >
              <svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <line x1="2" y1="6" x2="10" y2="6" />
              </svg>
            </button>
            <span className="w-9 text-center font-mono text-[0.875rem] tabular-nums" aria-live="polite">
              {cantidad}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(units, q + 1))}
              disabled={cantidad >= units}
              aria-label={t('product.increase')}
              className="grid size-11 place-items-center text-fg-mid transition-colors hover:text-fg disabled:opacity-35"
            >
              <svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <line x1="2" y1="6" x2="10" y2="6" />
                <line x1="6" y1="2" x2="6" y2="10" />
              </svg>
            </button>
          </div>
          {availability === 'ultimas-unidades' ? (
            <span className="u-tag text-amber" role="status">
              {units} {units === 1 ? t('product.unit') : t('product.units')}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5">
        {/* ── acción principal ── */}
        {hasWhatsapp ? (
          <a
            href={whatsappUrl(mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="comprar-whatsapp"
            data-lead=""
            className="u-cta u-cta--block"
          >
            <CtaBody>
              <span className="u-invite">{t('cta.buyWhatsapp')}</span>
              <span className="u-nudge" aria-hidden="true">
                →
              </span>
            </CtaBody>
          </a>
        ) : null}

        {/* ── acción secundaria ── */}
        <AddToCart
          product={product}
          qty={cantidad}
          variant="line"
          disabled={soldOut}
          cartVariant={
            variant
              ? {
                  sku: variant.sku,
                  label: variant.label,
                  priceUsd: variant.priceUsd,
                  attributes: variant.attributes,
                }
              : undefined
          }
          testId="agregar"
        />
      </div>

      {soldOut ? (
        <p className="u-label mt-4 normal-case tracking-normal">{t('product.soldOutNote')}</p>
      ) : null}

      {/* En teléfono la acción vuelve al pie en cuanto se pierde de vista. */}
      <StickyBuyBar
        href={hasWhatsapp ? whatsappUrl(mensaje) : null}
        priceUsd={price}
        label={t('cta.buyWhatsapp')}
        soldOut={soldOut}
      />
    </div>
  )
}

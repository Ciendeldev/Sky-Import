'use client'

import { useState } from 'react'
import { CtaBody } from '@/components/ui/Cta'
import { useCart, type CartLine } from '@/lib/cart'
import { useUi } from '@/lib/ui'
import { useI18n } from '@/lib/i18n/context'
import { hasWhatsapp, whatsappLink } from '@/config/site'
import type { Product } from '@/lib/catalog/types'

/**
 * Añadir al carrito con respuesta visible: el botón confirma en su propio sitio
 * durante 1,6 s y además se anuncia por la región `aria-live` del avisador. No
 * abre el cajón de golpe: interrumpir a quien está mirando el catálogo para
 * mostrarle el carrito es una interrupción, no una confirmación.
 *
 * Si la pieza no tiene unidades, el botón cede su lugar al canal que sí puede
 * resolverlo: la consulta por WhatsApp con el modelo ya escrito.
 *
 * Es la misma pieza conectada que la acción principal de la portada, en sus dos
 * tallas:
 *
 *   · `variant="solid"` — el botón grande de la ficha. Es la acción
 *     protagonista de esa vista, así que lleva `data-lead` y la corriente no
 *     para.
 *   · `variant="line"` — el de cada tarjeta del catálogo. Misma pieza, talla de
 *     retícula y **quieta en reposo**: la corriente arranca cuando el puntero
 *     llega. Con treinta y siete tarjetas en pantalla, animarlas todas a la vez
 *     sería exactamente el error que costó los cuadros de la retícula de
 *     categorías.
 *
 * Agotado NO usa esta pieza: llevar a WhatsApp no es la acción que la vista
 * quiere destacar, y darle el mismo peso confundiría lo que se está ofreciendo.
 */
export function AddToCart({
  product,
  qty = 1,
  disabled = false,
  variant = 'solid',
  cartVariant,
  className,
  testId,
}: {
  product: Product
  qty?: number
  disabled?: boolean
  /** `solid` es la acción protagonista de la vista; `line`, la de una tarjeta. */
  variant?: 'solid' | 'line'
  /** Variante elegida en la ficha. Sin ella, se agrega la pieza a secas. */
  cartVariant?: CartLine['variant']
  className?: string
  /** Marca el botón principal de la ficha para poder apuntarle en las pruebas. */
  testId?: string
}) {
  const { t } = useI18n()
  const add = useCart((s) => s.add)
  const toast = useUi((s) => s.toast)
  const [confirmed, setConfirmed] = useState(false)

  if (disabled) {
    if (!hasWhatsapp) {
      return (
        <button type="button" disabled data-testid={testId} className={`u-btn u-btn-line w-full ${className ?? ''}`}>
          {t('product.availability.agotado')}
        </button>
      )
    }
    return (
      <a
        href={whatsappLink(`${t('wa.productMessage')} ${product.name} (${product.ref})`)}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testId}
        className={`u-btn u-btn-line w-full ${className ?? ''}`}
      >
        {t('product.soldOut')}
      </a>
    )
  }

  const lead = variant === 'solid'

  return (
    <button
      type="button"
      data-testid={testId}
      data-lead={lead ? '' : undefined}
      className={`u-cta u-cta--block ${lead ? '' : 'u-cta--sm'} ${className ?? ''}`}
      onClick={() => {
        add(product.slug, qty, cartVariant)
        setConfirmed(true)
        window.setTimeout(() => setConfirmed(false), 1600)
        toast(`${product.name} ${t('product.addedToCart')}`)
      }}
    >
      <CtaBody>
        {confirmed ? (
          <>
            <svg viewBox="0 0 14 14" width="12" height="12" stroke="currentColor" strokeWidth="1.6" fill="none" aria-hidden="true">
              <path d="M2 7.4 L5.4 11 L12 3.4" />
            </svg>
            {t('cta.added')}
          </>
        ) : (
          <>
            <span className={lead ? 'u-invite' : undefined}>{t('cta.add')}</span>
            <span className="u-nudge" aria-hidden="true">
              →
            </span>
          </>
        )}
      </CtaBody>
    </button>
  )
}

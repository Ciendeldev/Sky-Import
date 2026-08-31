'use client'

import { useState } from 'react'
import { ComponentDims } from '@/components/render/ComponentRender'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { renderDims } from '@/lib/catalog/derive'
import { useI18n } from '@/lib/i18n/context'
import type { Product } from '@/lib/catalog/types'

/**
 * Galería de dos vistas. La segunda NO es otra fotografía: es el mismo negativo
 * con las cotas encima. Cruzan en 400 ms, que es la duración de la casa para el
 * cambio de vista.
 *
 * En escritorio basta con acercar el puntero. En teléfono hay dos pestañas
 * reales, porque el hover no existe.
 */
export function Gallery({
  product,
  /**
   * Imagen propia de la variante elegida. Cuando existe, sustituye al dibujo:
   * es el punto del selector de variantes —cambiar de versión cambia lo que se
   * ve, no solo el código—.
   */
  imageUrl,
  imageAlt,
}: {
  product: Product
  imageUrl?: string | null
  imageAlt?: string
}) {
  const { t, locale } = useI18n()
  const [view, setView] = useState<'front' | 'annotated'>('front')
  const dims = renderDims(product, locale)

  return (
    <div>
      <div
        className="u-plate group relative aspect-[4/3] overflow-hidden rounded-part border border-rule bg-surface-sunk"
        data-cursor="drag"
        data-cursor-label={t('product.gallery.annotated')}
        onMouseEnter={() => setView('annotated')}
        onMouseLeave={() => setView('front')}
      >
        <div className="absolute inset-0 p-6">
          {imageUrl ? (
            // La imagen propia de una variante gana sobre la del producto: es
            // la razón de ser del selector. Va como `<img>` y no `next/image`
            // porque su URL la carga el operador y puede ser de cualquier
            // origen, que es lo que el optimizador no acepta sin declararlo en
            // `next.config.ts`.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt ?? product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <ProductPhoto
              product={product}
              priority
              sizes="(min-width: 1024px) 56vw, 92vw"
            />
          )}
        </div>
        {/* Las cotas se superponen sobre el mismo dibujo, no lo repiten. */}
        <div
          className="absolute inset-0 grid place-items-center p-6 transition-opacity duration-[400ms] ease-rail"
          style={{ opacity: view === 'annotated' ? 1 : 0 }}
          aria-hidden={view === 'front'}
        >
          <ComponentDims dims={dims} className="w-full max-w-[680px]" />
        </div>

        <span className="u-sweep" aria-hidden="true" />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {(['front', 'annotated'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            className="u-tag min-h-[44px] min-w-[44px] border-rule px-3 text-fg-low transition-colors hover:text-fg aria-pressed:border-fg aria-pressed:text-fg"
          >
            {option === 'front' ? t('product.gallery.front') : t('product.gallery.annotated')}
          </button>
        ))}
        <span className="u-label ml-auto hidden lg:inline">{t('product.gallery.hint')}</span>
      </div>
    </div>
  )
}

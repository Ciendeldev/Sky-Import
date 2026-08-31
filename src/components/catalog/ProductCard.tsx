'use client'

import Link from 'next/link'
import { ComponentDims } from '@/components/render/ComponentRender'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { Price } from '@/components/ui/Price'
import { AddToCart } from '@/components/product/AddToCart'
import { Tilt } from '@/components/motion/Motion'
import { availabilityOf, type Product } from '@/lib/catalog/types'
import { headlineSpec, renderDims } from '@/lib/catalog/derive'
import { useI18n } from '@/lib/i18n/context'
import { discountPercent } from '@/lib/money'
import { RULES } from '@/config/site'

/**
 * LA FICHA COMO MANIFIESTO
 *
 * Sin borde de tarjeta: solo un filete arriba, como una fila de un muestrario
 * impreso. Lo que pasa al acercarse:
 *
 *   · el pozo se inclina siguiendo al puntero y recibe un roce de luz;
 *   · la pieza se levanta y se agranda un punto;
 *   · las cotas cruzan por encima en 400 ms — no se redibuja la pieza, se le
 *     superpone la capa de medidas;
 *   · el filete bajo el nombre se dibuja de izquierda a derecha;
 *   · el índice se enciende en cian.
 */
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { t, locale } = useI18n()
  const availability = availabilityOf(product, RULES.lowStockAt)
  const off = discountPercent(product.priceUsd, product.listPriceUsd)
  const soldOut = availability === 'agotado'

  return (
    <article className="group relative flex flex-col border-t border-rule pt-5">
      <Link
        href={`/${locale}/producto/${product.slug}`}
        prefetch={false}
        data-cursor="product"
        data-cursor-label={t('cta.view')}
        className="flex flex-1 flex-col outline-offset-8"
      >
        <Tilt max={6} scale={1.012}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-part bg-surface-sunk">
            <div className="u-plate absolute inset-0 opacity-60" aria-hidden="true" />

            {/* La foto real de la pieza; si no tiene, su dibujo. El acercamiento
                lo hace la propia imagen, no un envoltorio que escale también
                las cotas. */}
            <div className="absolute inset-0 p-4">
              <ProductPhoto
                product={product}
                sizes="(min-width: 1280px) 24vw, (min-width: 640px) 40vw, 88vw"
              />
            </div>

            <div className="absolute inset-0 flex items-center justify-center p-2 opacity-0 transition-opacity duration-[400ms] ease-rail group-hover:opacity-100 group-focus-within:opacity-100">
              <ComponentDims dims={renderDims(product, locale)} className="w-[112%] max-w-none" />
            </div>

            <span
              className="u-sweep opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              aria-hidden="true"
            />

            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              {off ? (
                <span className="u-tag bg-surface text-amber">
                  −{off}% {t('product.tag.off')}
                </span>
              ) : null}
              {product.arrivedRecently && !off ? (
                <span className="u-tag bg-surface text-fg-mid">{t('product.tag.new')}</span>
              ) : null}
            </div>
          </div>
        </Tilt>

        <div className="flex flex-1 flex-col pt-4">
          <p className="u-label flex items-center gap-2">
            <span className="tabular-nums text-fg-low transition-colors duration-300 ease-rail group-hover:text-accent">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{product.brand}</span>
          </p>

          <h3 className="mt-2 text-[0.9375rem] font-medium leading-snug text-fg">
            <span className="relative inline">
              {product.name}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-[320ms] ease-rail group-hover:scale-x-100 group-focus-within:scale-x-100" />
            </span>
          </h3>

          <p className="mt-2 font-mono text-[0.6875rem] leading-relaxed tabular-nums text-fg-low">
            {headlineSpec(product, locale)}
          </p>

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <span className="flex flex-col">
              {off ? (
                <Price
                  usd={product.listPriceUsd ?? product.priceUsd}
                  strike
                  className="font-mono text-[0.6875rem] text-fg-low"
                />
              ) : null}
              <Price usd={product.priceUsd} className="font-mono text-base font-medium text-fg" />
            </span>
            <span
              className={`u-tag ${
                availability === 'agotado'
                  ? 'text-rust'
                  : availability === 'ultimas-unidades'
                    ? 'text-amber'
                    : 'text-fg-low'
              }`}
            >
              {t(`product.availability.${availability}`)}
            </span>
          </div>
        </div>
      </Link>

      <div className="pt-4">
        <AddToCart product={product} disabled={soldOut} variant="line" />
      </div>
    </article>
  )
}

'use client'

import Link from 'next/link'
import { AssemblyVisual } from '@/components/home/AssemblyVisual'
import { Price } from '@/components/ui/Price'
import { Reveal } from '@/components/ui/Reveal'
import { PRODUCT_BY_SLUG } from '@/lib/catalog/products'
import { useI18n } from '@/lib/i18n/context'

/** Despiece reversible con scroll; la ficha y los precios siguen viniendo del catálogo. */

/** Las especificaciones que deciden si la placa entra en una máquina. */
const CLAVES = ['16 GB GDDR7', 'PCIe 5.0 ×16', '360 W', '850 W', '336 mm', '3'] as const

export function AssemblySection() {
  const { t, locale, path } = useI18n()
  const product = PRODUCT_BY_SLUG.get('geforce-rtx-5080-16gb')

  // La portada no puede caerse porque alguien despublique una pieza.
  if (!product) return null

  const texto = (v: string | { es: string; pt: string }) =>
    typeof v === 'string' ? v : v[locale]

  const fichas = product.specs.filter((spec) =>
    (CLAVES as readonly string[]).includes(texto(spec.value)),
  )

  return (
    <section className="u-page border-t border-rule py-24 lg:py-32" aria-labelledby="destacada">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="self-start lg:sticky lg:top-24 lg:col-span-4">
          <Reveal>
            <p className="u-eyebrow">{t('assembly.eyebrow')}</p>
            <h2 id="destacada" className="u-display mt-5 text-[clamp(1.9rem,4vw,3rem)]">
              {product.name}
            </h2>
            <p className="u-measure mt-5 text-[0.9375rem] leading-relaxed text-fg-mid">
              {product.blurb[locale]}
            </p>
          </Reveal>

          <Reveal delayIndex={1}>
            <dl className="mt-8">
              {fichas.map((spec) => (
                <div key={texto(spec.label)} className="u-spec">
                  <dt className="font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-low">
                    {texto(spec.label)}
                  </dt>
                  <dd className="font-mono text-[0.8125rem] tabular-nums text-fg">
                    {texto(spec.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delayIndex={2}>
            <p className="mt-8 text-[1.5rem] font-medium tabular-nums text-fg">
              <Price usd={product.priceUsd} />
            </p>
            <Link
              href={path(`/producto/${product.slug}`)}
              className="u-btn u-btn-solid mt-5 inline-flex"
            >
              {t('assembly.cta')}
              <span aria-hidden="true">→</span>
            </Link>
            <p className="u-label mt-6 leading-relaxed normal-case tracking-normal">
              {t('assembly.note')}
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-8">
          <AssemblyVisual product={product} />
        </div>
      </div>
    </section>
  )
}

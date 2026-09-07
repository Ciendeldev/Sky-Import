'use client'

import Link from 'next/link'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { Price } from '@/components/ui/Price'
import { Reveal } from '@/components/ui/Reveal'
import { PRODUCT_BY_SLUG } from '@/lib/catalog/products'
import { useI18n } from '@/lib/i18n/context'

/**
 * LA PIEZA MÁS CARA DEL CATÁLOGO, EN GRANDE
 *
 * Acá vivía un despiece 3D de una placa de video construida con geometría de
 * código: siete capas que se separaban con el scroll. Era una demostración
 * técnica honesta y estaba bien hecha, pero enseñaba **un dibujo**, y esta es
 * una tienda de importación: lo que tiene que ver quien entra es la pieza que
 * le van a entregar, no una interpretación de ella. Un cliente que compara
 * precios de una 5080 no quiere admirar un render; quiere reconocer la placa.
 *
 * Se retiró junto con `GpuAssembly` y su dependencia de WebGL en la portada.
 * three.js sigue en el proyecto para el armado de la sección «Arma tu PC»,
 * donde el 3D sí aporta algo que una foto no puede: el orden del montaje.
 *
 * Las fichas técnicas salen del catálogo tipado, no están escritas acá: si
 * mañana cambia el largo o el consumo de la placa, esta sección cambia sola.
 */

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
        <div className="lg:col-span-4">
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
          <Reveal>
            <div className="u-plate relative aspect-[4/3] overflow-hidden rounded-part border border-rule bg-surface-sunk lg:aspect-[16/11]">
              <ProductPhoto
                product={product}
                sizes="(min-width: 1024px) 62vw, 100vw"
                className="absolute inset-0"
                imageClassName="h-full w-full object-contain p-8 lg:p-12"
              />
              <p className="u-label absolute bottom-4 left-4 flex items-center gap-2">
                <span className="inline-block h-px w-6 bg-accent" aria-hidden="true" />
                {t('assembly.hint')}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

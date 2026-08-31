'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Gallery } from '@/components/product/Gallery'
import { BuyBox } from '@/components/product/BuyBox'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Price } from '@/components/ui/Price'
import { Magnetic, Reveal, SplitWords } from '@/components/motion/Motion'
import { PRODUCTS, PRODUCT_BY_SLUG } from '@/lib/catalog/products'
import { CATEGORY_META } from '@/lib/catalog/categories'
import { availabilityOf } from '@/lib/catalog/types'
import { constraintsOf } from '@/lib/catalog/derive'
import { useI18n } from '@/lib/i18n/context'
import { discountPercent } from '@/lib/money'
import { RULES } from '@/config/site'
import {
  defaultSelection,
  matchVariant,
  priceOf,
  unitsOf,
  type Variant,
} from '@/lib/variants'

export function ProductView({ slug, variants = [] }: { slug: string; variants?: Variant[] }) {
  const { t, l, locale, path } = useI18n()
  // La variante elegida vive acá y no dentro del bloque de compra: la galería
  // también la necesita, y dos copias del mismo estado se desincronizan.
  const [variant, setVariant] = useState<Variant | null>(
    () => (variants.length > 0 ? matchVariant(variants, defaultSelection(variants)) : null),
  )

  const product = PRODUCT_BY_SLUG.get(slug)
  if (!product) return null

  const category = CATEGORY_META[product.category]
  const units = unitsOf(variant, product.units)
  const price = priceOf(variant, product.priceUsd)
  const availability = availabilityOf({ ...product, units }, RULES.lowStockAt)
  const off = discountPercent(price, product.listPriceUsd)
  const constraints = constraintsOf(product, locale)
  const related = PRODUCTS.filter(
    (item) => item.category === product.category && item.slug !== product.slug,
  ).slice(0, 3)

  return (
    <>
      <div className="u-page pt-24 lg:pt-32">
        <nav aria-label="breadcrumb" className="u-label flex flex-wrap items-center gap-2">
          <Link href={path('/catalogo')} className="u-link u-tap hover:text-fg">
            {t('catalog.title')}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`${path('/catalogo')}?categoria=${product.category}`}
            className="u-link u-tap hover:text-fg"
          >
            {category.name[locale]}
          </Link>
        </nav>
      </div>

      <article className="u-page grid gap-12 py-10 lg:grid-cols-12 lg:gap-14 lg:py-14">
        <Reveal from="left" className="lg:col-span-7">
          <Gallery
            product={product}
            imageUrl={variant?.imageUrl}
            imageAlt={variant ? `${product.name} — ${variant.label[locale]}` : product.name}
          />
        </Reveal>

        <div className="lg:col-span-5">
          <Reveal>
            <p className="u-eyebrow">{product.brand}</p>
          </Reveal>

          <SplitWords
            as="h1"
            start="now"
            text={product.name}
            className="u-display-sm mt-4 text-[clamp(1.75rem,4vw,2.5rem)]"
          />

          <Reveal delayIndex={2}>
            <p className="u-label mt-3 tabular-nums" aria-live="polite">
              {t('product.ref')} {variant?.sku ?? product.ref}
            </p>

            <p className="u-measure mt-6 text-[1rem] leading-relaxed text-fg-mid">
              {product.blurb[locale]}
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-rule pt-6">
              {off ? (
                <>
                  <Price
                    usd={product.listPriceUsd ?? product.priceUsd}
                    strike
                    className="font-mono text-[0.875rem] text-fg-low"
                  />
                  <span className="u-tag text-amber">
                    −{off}% {t('product.tag.off')}
                  </span>
                </>
              ) : null}
              <Price
                usd={price}
                className="w-full font-mono text-[clamp(1.5rem,4vw,2rem)] font-medium text-fg"
              />
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

            <BuyBox product={product} variants={variants} onVariantChange={setVariant} />

            <p className="u-label mt-5 leading-relaxed normal-case tracking-normal">
              {t('product.priceNote')} {t('currency.note')}
            </p>
          </Reveal>
        </div>
      </article>

      <section className="u-page grid gap-12 border-t border-rule py-16 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <Reveal>
            <h2 className="u-label text-fg">{t('product.specs')}</h2>
          </Reveal>
          <dl className="mt-5">
            {product.specs.map((spec, i) => (
              <Reveal
                key={spec.label[locale]}
                delayIndex={i}
                from="right"
                distance={14}
                className="u-spec"
              >
                <dt>{spec.label[locale]}</dt>
                <dd>{l(spec.value)}</dd>
              </Reveal>
            ))}
          </dl>
          <p className="u-label mt-5 leading-relaxed normal-case tracking-normal">
            {t('product.specsNote')}
          </p>
        </div>

        {constraints.length > 0 ? (
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="u-label text-fg">{t('product.compat')}</h2>
            </Reveal>
            <ul className="mt-5">
              {constraints.map((line, i) => (
                <Reveal
                  as="li"
                  key={line}
                  delayIndex={i}
                  className="flex gap-4 border-b border-rule py-4"
                >
                  <span className="font-mono text-[0.625rem] tabular-nums text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.9375rem] leading-relaxed text-fg-mid">{line}</span>
                </Reveal>
              ))}
            </ul>
            <Reveal delayIndex={3}>
              <Magnetic strength={0.18}>
                <Link href={path('/armar')} className="u-btn u-btn-line mt-6">
                  {t('cta.build')}
                  <span className="u-nudge" aria-hidden="true">
                    →
                  </span>
                </Link>
              </Magnetic>
            </Reveal>
          </div>
        ) : null}
      </section>

      {related.length > 0 ? (
        <section className="u-page border-t border-rule py-16 pb-24">
          <Reveal>
            <h2 className="u-label text-fg">{t('product.related')}</h2>
          </Reveal>
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, i) => (
              <Reveal key={item.slug} delayIndex={i}>
                <ProductCard product={item} index={i} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

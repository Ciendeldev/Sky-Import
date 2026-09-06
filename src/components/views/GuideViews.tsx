'use client'

import Link from 'next/link'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { Reveal, SplitWords } from '@/components/motion/Motion'
import { GUIDES, GUIDE_BY_SLUG, type Guide } from '@/content/guides'
import { PRODUCTS } from '@/lib/catalog/products'
import { useI18n } from '@/lib/i18n/context'
import type { RenderSpec } from '@/lib/catalog/types'

/**
 * Cada guía se ilustra con una pieza real de la familia que explica: la que
 * habla de zócalos muestra un procesador, la de milímetros un gabinete. Es más
 * concreto que un icono, y evita mantener un segundo juego de ilustraciones.
 */
const CATEGORIA_DE_FORMA: Partial<Record<RenderSpec['shape'], string>> = {
  cpu: 'procesadores',
  ram: 'memorias-ram',
  psu: 'fuentes',
  case: 'gabinetes',
  gpu: 'tarjetas-graficas',
  motherboard: 'placas-madre',
}

function piezaDeGuia(guide: Guide) {
  const categoria = CATEGORIA_DE_FORMA[guide.shape]
  return PRODUCTS.find((p) => p.category === categoria) ?? PRODUCTS[0]!
}

export function GuidesView() {
  const { t, locale, path } = useI18n()

  return (
    <div data-surface="aluminio" className="bg-surface text-fg">
      <header className="u-page pt-28 pb-12 lg:pt-36">
        <Reveal>
          <p className="u-eyebrow">{t('guides.eyebrow')}</p>
        </Reveal>
        <SplitWords
          as="h1"
          start="now"
          text={t('guides.title')}
          className="u-display mt-5 text-[clamp(2.2rem,5.5vw,4rem)]"
        />
        <Reveal delayIndex={2}>
          <p className="u-measure mt-5 text-[1.0625rem] leading-relaxed text-fg-mid">
            {t('guides.lede')}
          </p>
        </Reveal>
      </header>

      <div className="u-page pb-24">
        <ul className="border-t border-rule">
          {GUIDES.map((guide, i) => (
            <Reveal as="li" key={guide.slug} delayIndex={i} className="border-b border-rule">
              <Link
                href={path(`/guias/${guide.slug}`)}
                className="group grid gap-5 py-8 md:grid-cols-12 md:items-center md:gap-8"
              >
                <span className="font-mono text-[0.6875rem] tabular-nums text-accent md:col-span-1">
                  {guide.index}
                </span>
                <span className="relative hidden aspect-square w-20 opacity-80 transition-all duration-500 ease-rail group-hover:-translate-y-1 group-hover:opacity-100 md:col-span-2 md:block">
                  <ProductPhoto product={piezaDeGuia(guide)} sizes="80px" />
                </span>
                <span className="md:col-span-9">
                  <span className="u-display-sm block text-[clamp(1.25rem,2.6vw,1.75rem)]">
                    <span className="relative inline">
                      {guide.title[locale]}
                      <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-[320ms] ease-rail group-hover:scale-x-100" />
                    </span>
                  </span>
                  <span className="u-measure-wide mt-3 block text-[0.9375rem] leading-relaxed text-fg-mid">
                    {guide.standfirst[locale]}
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function GuideView({ slug }: { slug: string }) {
  const { t, locale, path } = useI18n()
  const guide = GUIDE_BY_SLUG.get(slug)
  if (!guide) return null

  const next = GUIDES[(GUIDES.findIndex((g) => g.slug === slug) + 1) % GUIDES.length]

  return (
    <div data-surface="aluminio" className="bg-surface text-fg">
      <article className="u-page pt-28 pb-20 lg:pt-36">
        <Link href={path('/guias')} className="u-link u-tap u-label hover:text-fg">
          ← {t('guides.back')}
        </Link>

        <header className="mt-10 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Reveal>
              <p className="u-eyebrow">
                {t('guides.eyebrow')} · {guide.index}
              </p>
            </Reveal>
            <SplitWords
              as="h1"
              start="now"
              text={guide.title[locale]}
              className="u-display mt-5 text-[clamp(2rem,5vw,3.5rem)]"
            />
            <Reveal delayIndex={2}>
              <p className="u-measure-wide mt-6 text-[1.125rem] leading-relaxed text-fg-mid">
                {guide.standfirst[locale]}
              </p>
            </Reveal>
          </div>
          <Reveal delayIndex={1} from="right" className="hidden lg:col-span-4 lg:block">
            <span className="relative block aspect-square w-full">
              <ProductPhoto product={piezaDeGuia(guide)} sizes="(min-width: 1024px) 30vw, 0px" />
            </span>
          </Reveal>
        </header>

        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:col-start-3">
            {guide.sections.map((section, i) => (
              <section key={section.heading[locale]} className="border-t border-rule pt-8 pb-10">
                <Reveal>
                  <p className="u-label mb-4">
                    <span className="tabular-nums text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </p>
                </Reveal>
                <SplitWords
                  as="h2"
                  text={section.heading[locale]}
                  className="u-display-sm text-[clamp(1.25rem,2.6vw,1.75rem)]"
                />
                <div className="mt-5 flex flex-col gap-5">
                  {section.body.map((paragraph, k) => (
                    <Reveal
                      as="p"
                      key={paragraph[locale].slice(0, 32)}
                      delayIndex={k}
                      className="u-measure-wide text-[1.0625rem] leading-[1.75] text-fg-mid"
                    >
                      {paragraph[locale]}
                    </Reveal>
                  ))}
                </div>
              </section>
            ))}

            {next ? (
              <Link
                href={path(`/guias/${next.slug}`)}
                className="group flex items-center justify-between gap-6 border-t border-rule pt-8"
              >
                <span>
                  <span className="u-label block">{t('guides.read')}</span>
                  <span className="u-display-sm mt-2 block text-[1.25rem]">
                    {next.title[locale]}
                  </span>
                </span>
                <span
                  className="shrink-0 text-fg-low transition-transform duration-300 ease-rail group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" strokeWidth="1.3" fill="none">
                    <path d="M2 8h11M9 4l4 4-4 4" />
                  </svg>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  )
}

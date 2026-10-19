'use client'

import Link from 'next/link'
import { BrandMark, Wordmark } from '@/components/brand/Wordmark'
import { Trace } from '@/components/motif/Trace'
import { Marquee, Reveal } from '@/components/motion/Motion'
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/catalog/categories'
import { GUIDES } from '@/content/guides'
import { useI18n } from '@/lib/i18n/context'
import { useCatalog } from '@/lib/catalog/context'
import { CONTACT, SITE, hasWhatsapp, whatsappLink } from '@/config/site'

/**
 * El trazado sale del sello hacia los bordes: es el cuarto y último lugar donde
 * aparece el motivo de la casa. Encima, una cinta con las marcas del catálogo
 * que se detiene al acercar el puntero — un rótulo en movimiento, no un
 * carrusel: no hay nada que perderse si pasa de largo.
 */
export function Footer() {
  const { t, l, locale, path } = useI18n()
  const { brands } = useCatalog()

  return (
    <footer className="relative border-t border-rule bg-surface">
      <div className="border-b border-rule py-5">
        <Marquee items={brands} duration={46} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-16 h-28 overflow-hidden text-steel opacity-25">
        <Trace width={1400} height={112} lines={4} seed={41} className="h-full w-full" />
      </div>

      <div className="u-page relative pt-24 pb-12">
        <div className="grid gap-12 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <div className="flex items-center gap-2.5 text-fg">
              <BrandMark size={26} className="text-accent" animate="hover" />
              <Wordmark className="text-sm" />
              <span className="sr-only">{SITE.name}</span>
            </div>
            <p className="u-measure mt-5 text-[0.9375rem] leading-relaxed text-fg-mid">
              {l({
                es: 'Importación de componentes para montar, mejorar y personalizar computadoras. Publicamos la ficha técnica antes que la promesa comercial.',
                pt: 'Importação de componentes para montar, melhorar e personalizar computadores. Publicamos a ficha técnica antes da promessa comercial.',
              })}
            </p>
            <p className="u-label mt-6">{t('brand.place')}</p>
          </Reveal>

          <Reveal as="nav" delayIndex={1} className="md:col-span-3" aria-labelledby="pie-tienda">
            <h2 id="pie-tienda" className="u-label mb-4 text-fg">
              {t('footer.explore')}
            </h2>
            <ul>
              {[
                { href: '/catalogo', label: t('nav.catalog') },
                { href: '/armar', label: t('nav.build') },
                { href: '/guias', label: t('nav.guides') },
                { href: '/carrito', label: t('nav.cart') },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={path(item.href)}
                    className="u-link u-tap text-[0.875rem] text-fg-mid hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className="u-label mt-8 mb-4 text-fg">{t('catalog.category')}</h2>
            <ul>
              {CATEGORY_ORDER.slice(0, 5).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`${path('/catalogo')}?categoria=${slug}`}
                    prefetch={false}
                    className="u-link u-tap text-[0.8125rem] text-fg-low hover:text-fg"
                  >
                    {CATEGORY_META[slug].name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal as="nav" delayIndex={2} className="md:col-span-2" aria-labelledby="pie-guias">
            <h2 id="pie-guias" className="u-label mb-4 text-fg">
              {t('footer.help')}
            </h2>
            {/* Aquí sí hace falta separación: varios títulos ocupan dos líneas y
                sin ella se tocan. Las otras listas son de una línea y el alto de
                44 px ya les da el ritmo. */}
            <ul className="space-y-2">
              {GUIDES.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={path(`/guias/${guide.slug}`)}
                    className="u-link u-tap text-[0.8125rem] text-fg-mid hover:text-fg"
                  >
                    {guide.title[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayIndex={3} className="md:col-span-2">
            <h2 className="u-label mb-4 text-fg">{t('footer.contact')}</h2>
            {hasWhatsapp ? (
              <>
                <a
                  href={whatsappLink(t('wa.generic'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="u-link u-tap font-mono text-[0.8125rem] tabular-nums text-fg"
                >
                  {CONTACT.whatsappDisplay}
                </a>
                <p className="u-label mt-2 normal-case tracking-normal">WhatsApp</p>
              </>
            ) : null}
          </Reveal>
        </div>

        <div className="u-rule mt-14" />

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <p className="u-measure-wide u-label leading-relaxed normal-case tracking-normal">
            <span className="font-medium uppercase tracking-[0.14em]">{t('footer.legal')} — </span>
            {t('footer.legalNote')}
          </p>
          <p className="u-label shrink-0">
            © {SITE.name}. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}

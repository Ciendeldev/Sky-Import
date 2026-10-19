import type { Metadata } from 'next'
import { SITE } from '@/config/site'
import { LOCALE_META, type Locale } from '@/lib/i18n/locales'

/** Cada ruta identifica su propio contenido y sus traducciones equivalentes. */
export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description?: string,
): Metadata {
  const url = `/${locale}${path}`
  return {
    title,
    ...(description ? { description } : {}),
    alternates: {
      canonical: url,
      languages: { es: `/es${path}`, 'pt-BR': `/pt${path}` },
    },
    openGraph: {
      type: 'website', siteName: SITE.name, locale: LOCALE_META[locale].htmlLang,
      url, title: `${title} · ${SITE.name}`, description,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: { card: 'summary_large_image', title: `${title} · ${SITE.name}`, description, images: ['/og.png'] },
  }
}

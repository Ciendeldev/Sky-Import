import { pageMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GuideView } from '@/components/views/GuideViews'
import { GUIDES, GUIDE_BY_SLUG } from '@/content/guides'
import { makeT } from '@/lib/i18n/dictionary'
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/locales'

/** Solo existen las guías escritas; cualquier otro slug es el 404 global. */
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => GUIDES.map((guide) => ({ locale, slug: guide.slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const locale: Locale = isLocale(raw) ? raw : 'es'
  const guide = GUIDE_BY_SLUG.get(slug)
  if (!guide) return { title: makeT(locale)('guides.notFound') }
  return pageMetadata(locale, `/guias/${slug}`, guide.title[locale], guide.standfirst[locale])
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  if (!GUIDE_BY_SLUG.has(slug)) notFound()
  return <GuideView slug={slug} />
}

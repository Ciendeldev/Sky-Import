import { pageMetadata } from '@/lib/metadata'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser'
import { CatalogSkeleton } from '@/components/catalog/CatalogSkeleton'
import { PageHeader } from '@/components/views/PageHeader'
import { makeT } from '@/lib/i18n/dictionary'
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/locales'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : 'es'
  const t = makeT(locale)
  return pageMetadata(locale, '/catalogo', t('catalog.title'), t('catalog.lede'))
}

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <>
      <PageHeader eyebrow="catalog.eyebrow" title="catalog.title" lede="catalog.lede" background="trace" />
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogBrowser />
      </Suspense>
    </>
  )
}

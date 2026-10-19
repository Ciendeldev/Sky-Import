import { pageMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Configurator } from '@/components/builder/Configurator'
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
  return pageMetadata(locale, '/armar', t('build.title'), t('build.lede'))
}

export default async function BuilderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <>
      <PageHeader eyebrow="build.eyebrow" title="build.title" lede="build.lede" background="beams" />
      <Configurator />
    </>
  )
}

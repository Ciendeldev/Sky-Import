import { pageMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow'
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
  return { ...pageMetadata(locale, '/checkout', makeT(locale)('checkout.title')), robots: { index: false, follow: true } }
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <>
      <PageHeader title="checkout.title" />
      <CheckoutFlow />
    </>
  )
}

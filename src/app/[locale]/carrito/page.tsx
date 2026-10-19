import { pageMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CartContents } from '@/components/cart/CartContents'
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
  return { ...pageMetadata(locale, '/carrito', makeT(locale)('cart.title')), robots: { index: false, follow: true } }
}

/**
 * En teléfono el carrito tiene página propia además del cajón: es más cómodo
 * revisar cantidades a pantalla completa que dentro de un panel deslizante.
 */
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <>
      <PageHeader eyebrow="checkout.orderSummary" title="cart.title" />
      <div className="u-page pb-24">
        <div className="mx-auto flex max-w-[720px] flex-col border-t border-rule">
          <CartContents />
        </div>
      </div>
    </>
  )
}

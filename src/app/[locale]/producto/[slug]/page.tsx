import { pageMetadata } from '@/lib/metadata'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductView } from '@/components/views/ProductView'
import { loadCatalog } from '@/lib/catalog/source'
import { variantsForSlug } from '@/lib/catalog/variantsServer'
import { makeT } from '@/lib/i18n/dictionary'
import { LOCALES, isLocale, type Locale } from '@/lib/i18n/locales'

/**
 * Las fichas del catálogo se generan al compilar, pero una pieza creada desde
 * el panel después del despliegue también tiene que tener página. Por eso un
 * slug desconocido no es un 404 inmediato: se busca en el catálogo vigente y,
 * si no está ahí —ni activo—, recién entonces responde el 404 global.
 */
export const dynamicParams = true

/**
 * La ficha sigue siendo estática, pero se vuelve a generar cada minuto: es lo
 * que hace que un cambio de stock o de variante hecho en el panel aparezca en
 * la tienda sin volver a desplegar.
 */
export const revalidate = 60

export async function generateStaticParams() {
  const { products } = await loadCatalog()
  return LOCALES.flatMap((locale) => products.map((product) => ({ locale, slug: product.slug })))
}

async function productOf(slug: string) {
  const { products } = await loadCatalog()
  return products.find((product) => product.slug === slug)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const locale: Locale = isLocale(raw) ? raw : 'es'
  const product = await productOf(slug)
  if (!product) return { title: makeT(locale)('product.notFound') }
  return pageMetadata(locale, `/producto/${slug}`, `${product.name} — ${product.brand}`, product.blurb[locale])
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const product = await productOf(slug)
  if (!product) notFound()

  // Las variantes se leen en el servidor y bajan como dato, no como consulta
  // del navegador: la ficha tiene que llegar completa en el primer pintado.
  // Sin Supabase conectado la lista viene vacía y la ficha es la de siempre.
  const variants = await variantsForSlug(slug)

  // La pieza baja entera desde acá y no se busca en el contexto: en una
  // navegación dentro de la tienda el layout no se vuelve a pedir, así que su
  // foto del catálogo puede ser de unos minutos antes. La de la página es la
  // de esta petición.
  return <ProductView product={product} variants={variants} />
}

import type { MetadataRoute } from 'next'
import { SITE } from '@/config/site'
import { LOCALES } from '@/lib/i18n/locales'
import { loadCatalog } from '@/lib/catalog/source'
import { GUIDES } from '@/content/guides'

/**
 * El sitemap se genera aunque robots excluya el sitio: cuando la tienda pase a
 * ser operativa no hay que escribirlo, solo levantar el bloqueo.
 *
 * Las rutas transaccionales (carrito y checkout) quedan fuera a propósito.
 * Las fichas son las del catálogo vigente: una pieza desactivada en el panel
 * no se anuncia, y una creada desde el panel sí.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await loadCatalog()
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    entries.push({ url: `${SITE.origin}/${locale}`, priority: 1 })
    entries.push({ url: `${SITE.origin}/${locale}/catalogo`, priority: 0.9 })
    entries.push({ url: `${SITE.origin}/${locale}/armar`, priority: 0.8 })
    entries.push({ url: `${SITE.origin}/${locale}/guias`, priority: 0.6 })

    for (const guide of GUIDES) {
      entries.push({ url: `${SITE.origin}/${locale}/guias/${guide.slug}`, priority: 0.5 })
    }
    for (const product of products) {
      entries.push({ url: `${SITE.origin}/${locale}/producto/${product.slug}`, priority: 0.7 })
    }
  }

  return entries
}

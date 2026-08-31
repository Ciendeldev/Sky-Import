import type { MetadataRoute } from 'next'
import { SITE } from '@/config/site'

/**
 * La tienda es un comercio operativo: se indexa.
 *
 * Lo único cerrado es el panel de administración y las rutas transaccionales,
 * que no aportan nada en un buscador y no deberían aparecer en resultados. El
 * `noindex` del panel se refuerza además con la cabecera `X-Robots-Tag` de
 * `next.config.ts`: dos capas, porque un `robots.txt` es una petición, no una
 * garantía.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/es/carrito', '/pt/carrito', '/es/checkout', '/pt/checkout'],
      },
    ],
    sitemap: `${SITE.origin}/sitemap.xml`,
  }
}

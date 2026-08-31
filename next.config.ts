import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Todo el material gráfico es local (SVG autoral + rasterizados generados en build).
    // No se permiten orígenes remotos: ningún hotlink frágil hacia imágenes externas.
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // El layout raíz vive bajo un segmento dinámico (`app/[locale]/layout.tsx`),
    // así que la 404 se compone con `app/global-not-found.tsx`.
    globalNotFound: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // El panel NUNCA se indexa ni se guarda en caché intermedia, aunque la
        // tienda ya sea pública. Es la única ruta con `noindex` del proyecto.
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
}

export default nextConfig

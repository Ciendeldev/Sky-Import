import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Archivo, Azeret_Mono } from 'next/font/google'
import './globals.css'

import { I18nProvider } from '@/lib/i18n/context'
import { CatalogProvider } from '@/lib/catalog/context'
import { loadCatalog } from '@/lib/catalog/source'
import { DEFAULT_LOCALE, LOCALE_META, isLocale, type Locale } from '@/lib/i18n/locales'
import { makeT } from '@/lib/i18n/dictionary'
import { prePaintScript } from '@/lib/prePaint'
import { Header } from '@/components/chrome/Header'
import { Footer } from '@/components/chrome/Footer'
import { NotFoundView } from '@/components/chrome/NotFoundView'
import { RenderDefs } from '@/components/render/RenderDefs'
import { Cursor } from '@/components/cursor/Cursor'

/**
 * 404 global.
 *
 * Hace falta este archivo —y no un `not-found.tsx` de segmento— porque el layout
 * raíz de este proyecto vive bajo un segmento dinámico (`app/[locale]/layout.tsx`)
 * para poder generar las dos versiones de idioma estáticamente. Con esa
 * estructura, Next.js documenta `global-not-found` como la vía correcta, y por
 * eso este archivo devuelve un documento completo con sus propias tipografías y
 * estilos.
 *
 * El idioma se recupera de la cabecera que escribe `proxy.ts`, así que un
 * visitante que estaba en portugués recibe el 404 en portugués.
 *
 * No se reproduce la intro: una pantalla de error no es un sitio donde retener a
 * nadie con una animación de marca.
 */

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const azeret = Azeret_Mono({ subsets: ['latin'], variable: '--font-azeret', display: 'swap' })

export const metadata: Metadata = {
  title: 'Sky Import',
  robots: { index: false, follow: false },
}

async function resolveLocale(): Promise<Locale> {
  const header = await headers()
  const value = header.get('x-sky-locale')
  return value && isLocale(value) ? value : DEFAULT_LOCALE
}

export default async function GlobalNotFound() {
  const locale = await resolveLocale()
  const t = makeT(locale)
  // El pie lista las marcas del catálogo vigente, así que también acá hace falta.
  const catalog = await loadCatalog()

  return (
    <html
      lang={LOCALE_META[locale].htmlLang}
      className={`${archivo.variable} ${azeret.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: prePaintScript(locale === 'pt' ? 'BRL' : 'USD'),
          }}
        />
      </head>
      <body className="text-fg antialiased">
        <I18nProvider initialLocale={locale}>
          <CatalogProvider snapshot={catalog}>
            <a href="#contenido" className="skip-link">
              {t('skip.toContent')}
            </a>
            <RenderDefs />
            <Cursor />
            <Header />
            <main id="contenido" tabIndex={-1}>
              <NotFoundView />
            </main>
            <Footer />
          </CatalogProvider>
        </I18nProvider>
      </body>
    </html>
  )
}

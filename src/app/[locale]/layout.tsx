import type { Metadata, Viewport } from 'next'
import { Archivo, Azeret_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import '../globals.css'

import { SITE } from '@/config/site'
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, isLocale, type Locale } from '@/lib/i18n/locales'
import { makeT } from '@/lib/i18n/dictionary'
import { I18nProvider } from '@/lib/i18n/context'
import { prePaintScript } from '@/lib/prePaint'
import { Header } from '@/components/chrome/Header'
import { RenderDefs } from '@/components/render/RenderDefs'
import { Footer } from '@/components/chrome/Footer'
import { CartDrawer } from '@/components/chrome/CartDrawer'
import { Toaster } from '@/components/chrome/Toaster'
import { Intro } from '@/components/intro/Intro'
import { Cursor } from '@/components/cursor/Cursor'

/* ═══════════════════════════════════════════════════════════════════════════
   CONTRATO DE DIRECCIÓN — Sky Import

   TESIS  · La tienda se hojea como el manifiesto técnico de una importación:
            cada pieza llega con su ficha de despacho tabulada sobre grafito.
            Rechaza la grilla de tarjetas redondeadas con foto lavada y precio
            en píldora que envía todo comercio de hardware.
   MUNDO  · Dos superficies a página completa (carbón / aluminio). Filetes de
            1 px en vez de tarjetas. Cian de instrumento racionado a seis
            contextos. Ámbar reservado a advertencias. Trazado de PCB como único
            motivo. Cifras en monoespaciada tabular. Radios de 1 y 3 px.
   HISTORIA· Entiende que acá el dato va delante; cree que puede decidir sin
            adivinar porque socket, vataje y milímetros están declarados; y
            arma su equipo o compra la pieza exacta que le faltaba.
   VIEWPORT· Carbón a sangre con retícula de placa. Izquierda: antetítulo mono
            con guion cian, titular a clamp(2.6rem, 7vw, 6rem), línea de valor a
            62ch y dos acciones rectangulares. Derecha, desbordando el margen:
            el render de una placa de video con sus cotas. Al pie, un filete con
            cuatro pares etiqueta/valor.
   FORMA  · Dirección fijada por el brief del titular. El trabajo no fue elegir
            el mundo sino rendirlo fuera del cliché «negro con neón».
   ═══════════════════════════════════════════════════════════════════════════ */

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const azeret = Azeret_Mono({
  subsets: ['latin'],
  variable: '--font-azeret',
  display: 'swap',
})

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  const t = makeT(locale)

  const title =
    locale === 'es'
      ? 'Sky Import — Componentes para PC en Ciudad del Este'
      : 'Sky Import — Componentes para PC em Ciudad del Este'

  const description =
    locale === 'es'
      ? 'Tarjetas gráficas, procesadores, memorias, placas madre y todo para armar tu PC. Ficha técnica completa, compatibilidad comprobable y precios en dólares, guaraníes y reales.'
      : 'Placas de vídeo, processadores, memórias, placas-mãe e tudo para montar seu PC. Ficha técnica completa, compatibilidade verificável e preços em dólares, guaranis e reais.'

  return {
    metadataBase: new URL(SITE.origin),
    title: { default: title, template: `%s · ${SITE.name}` },
    description,
    applicationName: SITE.name,
    alternates: {
      canonical: `/${locale}`,
      languages: { es: '/es', 'pt-BR': '/pt' },
    },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: LOCALE_META[locale].htmlLang,
      title,
      description,
      url: `/${locale}`,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: `${SITE.name} — ${t('brand.role')}` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
    icons: { icon: '/icon.svg', apple: '/icon.svg' },
    formatDetection: { telephone: false },
  }
}

export const viewport: Viewport = {
  themeColor: '#0B0E12',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  if (!isLocale(raw)) notFound()
  const locale: Locale = raw
  const t = makeT(locale)

  return (
    <html
      lang={LOCALE_META[locale].htmlLang}
      className={`${archivo.variable} ${azeret.variable}`}
      // El atributo `data-currency` lo escribe el script previo al primer
      // pintado; el servidor no puede conocerlo.
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Fija moneda e intro ANTES del primer pintado: sin parpadeo y sin
            // desajuste de hidratación. Por idioma: quien lee en portugués
            // razona en reales.
            __html: prePaintScript(locale === 'pt' ? 'BRL' : 'USD'),
          }}
        />
      </head>
      <body className="text-fg antialiased">
        <I18nProvider initialLocale={locale}>
          {/* El campo de vías NO vive aquí.
              Estuvo un tiempo como lienzo fijo detrás de toda la tienda y el
              efecto era el contrario del buscado: cuando algo está en todas
              partes deja de ser un momento y pasa a ser ruido de fondo. Ahora
              va por secciones, con `FieldPatch`, en los tramos concretos donde
              aporta —y solo mientras se ven—. Ver `FieldPatch.tsx`. */}
          <RenderDefs />

          <a href="#contenido" className="skip-link">
            {t('skip.toContent')}
          </a>

          <Intro />
          <Cursor />

          <Header />

          <main id="contenido" tabIndex={-1}>
            {children}
          </main>

          <Footer />

          <CartDrawer />
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  )
}

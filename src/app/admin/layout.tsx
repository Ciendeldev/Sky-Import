import type { Metadata, Viewport } from 'next'
import { Archivo, Azeret_Mono } from 'next/font/google'
import '../globals.css'
import './admin.css'

/**
 * EL PANEL ES OTRO EDIFICIO
 *
 * Este es un segundo layout raíz, hermano de `app/[locale]/layout.tsx` y no
 * hijo suyo. La decisión es deliberada:
 *
 *   · El panel no es bilingüe. El operador es uno y trabaja en español.
 *   · No carga la intro, ni el cursor propio, ni el motor 3D, ni los fondos
 *     animados. Una herramienta de trabajo tiene que abrir rápido y quedarse
 *     quieta; la tienda es la que tiene que impresionar.
 *   · No se indexa, y la cabecera de `next.config.ts` lo garantiza.
 *
 * Comparte `globals.css` porque comparte los tokens: es la misma casa, con
 * densidad de herramienta en vez de densidad de vitrina.
 */

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const azeret = Azeret_Mono({ subsets: ['latin'], variable: '--font-azeret', display: 'swap' })

export const metadata: Metadata = {
  title: 'Panel · Sky Import',
  robots: { index: false, follow: false, nocache: true },
  /**
   * El sello, también acá.
   *
   * Al ser un layout raíz aparte, el panel no heredaba el icono de la tienda y
   * la pestaña salía con el globo genérico del navegador. En una barra con
   * ocho pestañas abiertas eso importa más de lo que parece: el operador que
   * tiene la tienda y el panel abiertos a la vez encuentra el suyo por la
   * forma, no leyendo los títulos uno por uno.
   */
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#0B0E12',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PY" className={`${archivo.variable} ${azeret.variable}`}>
      <body className="admin-body">{children}</body>
    </html>
  )
}

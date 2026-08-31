import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n/locales'

/**
 * El idioma vive en la ruta (`/es`, `/pt`), no en una cookie: así las dos
 * versiones se generan estáticamente, `<html lang>` es siempre correcto y la URL
 * se puede compartir. Este proxy solo decide a cuál de las dos entra quien
 * llega sin prefijo, y recuerda la elección para la próxima visita.
 */

const PUBLIC_FILE = /\.[^/]+$/

function preferredLocale(request: NextRequest): string {
  const saved = request.cookies.get('sky-import:locale')?.value
  if (saved && (LOCALES as readonly string[]).includes(saved)) return saved

  const header = request.headers.get('accept-language') ?? ''
  // Solo el portugués desvía del idioma por defecto.
  if (/\bpt\b/i.test(header)) return 'pt'
  return DEFAULT_LOCALE
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    // El panel de administración no lleva idioma en la ruta: no es bilingüe,
    // no se comparte y no se indexa. Sin esta línea, `/admin` acabaría
    // redirigido a `/es/admin`, que no existe.
    pathname.startsWith('/admin') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const matched = LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )

  if (matched) {
    // El 404 global no pasa por el layout del idioma, así que no puede leer el
    // parámetro de ruta. Se lo pasamos por cabecera para que hable su idioma.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-sky-locale', matched)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const locale = preferredLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}

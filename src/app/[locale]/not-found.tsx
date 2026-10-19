import { NotFoundView } from '@/components/chrome/NotFoundView'

/**
 * 404 de una ruta que SÍ existe, con un dato que no.
 *
 * `global-not-found.tsx` cubre las direcciones que no coinciden con ninguna
 * ruta. Desde que la ficha acepta slugs que no existían al compilar —las piezas
 * creadas desde el panel, ver ADR 012—, `/producto/no-existe` coincide con la
 * ruta y es la página la que llama a `notFound()`. Eso lo resuelve el límite
 * de este segmento, no el global, y sin este archivo Next.js mostraba su 404
 * genérico en inglés en lugar del de la casa.
 *
 * Va dentro del layout de la tienda, así que cabecera, pie e idioma ya están.
 */
export default function LocaleNotFound() {
  return <NotFoundView />
}

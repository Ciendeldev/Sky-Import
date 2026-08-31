import manifest from '../../../public/products/manifest.json'
import type { L10n } from '@/lib/i18n/locales'
import type { ProductImage } from '@/lib/supabase/types'

/**
 * FOTOGRAFÍA DE PRODUCTO
 *
 * Cada pieza del catálogo tiene una foto real, recortada sobre fondo
 * transparente, en `public/products/<slug>/primary.webp`. La procedencia de
 * cada una está documentada en `public/products/SOURCES.md`: página oficial del
 * fabricante y archivo original. Eso no es burocracia — este es un producto
 * comercial y publicar una imagen sin saber de dónde salió es un problema
 * legal, no estético.
 *
 * Hay TRES fuentes posibles, en este orden:
 *
 *   1. Las imágenes cargadas en la base desde el panel (`products.images`).
 *      Mandan sobre todo lo demás: es lo que el operador decidió.
 *   2. La foto local del catálogo, si esa pieza tiene una.
 *   3. Nada — y entonces se dibuja el render vectorial, que es lo que la tienda
 *      hacía antes de tener fotos.
 *
 * El punto 3 importa: una pieza nueva cargada desde el panel sin foto **no deja
 * un hueco**. Sale con su dibujo hasta que alguien le ponga una.
 */

/** Slugs que tienen foto local. Se deriva del manifiesto, no se escribe a mano. */
const CON_FOTO_LOCAL: ReadonlySet<string> = new Set(
  (manifest as Array<{ slug: string }>).map((entry) => entry.slug),
)

/** Crédito y página de origen, para poder rendir cuentas de cada imagen. */
const ORIGEN: ReadonlyMap<string, { credit: string; sourcePage: string }> = new Map(
  (manifest as Array<{ slug: string; credit: string; sourcePage: string }>).map((entry) => [
    entry.slug,
    { credit: entry.credit, sourcePage: entry.sourcePage },
  ]),
)

export interface ProductPhoto {
  src: string
  alt: L10n
  /** Quién hizo la foto. `null` para las que carga el operador. */
  credit: string | null
}

/**
 * La foto que corresponde a una pieza, o `null` si no tiene ninguna y hay que
 * caer al dibujo.
 *
 * `images` es lo que venga de la base; `slug` y `name` son del producto.
 */
export function photoOf(
  slug: string,
  name: string,
  images?: ProductImage[] | null,
): ProductPhoto | null {
  // 1 · lo que cargó el operador manda
  const primera = images?.[0]
  if (primera?.url) {
    return {
      src: primera.url,
      alt: {
        es: primera.alt_es || name,
        pt: primera.alt_pt || primera.alt_es || name,
      },
      credit: null,
    }
  }

  // 2 · la foto local del catálogo
  if (CON_FOTO_LOCAL.has(slug)) {
    return {
      src: `/products/${slug}/primary.webp`,
      alt: {
        es: `Fotografía de ${name}`,
        pt: `Fotografia de ${name}`,
      },
      credit: ORIGEN.get(slug)?.credit ?? null,
    }
  }

  // 3 · sin foto: el dibujo vectorial hace su trabajo
  return null
}

/** Cuántas piezas del catálogo llegan con foto. Se usa en las pruebas. */
export const PIEZAS_CON_FOTO = CON_FOTO_LOCAL.size

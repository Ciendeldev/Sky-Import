'use client'

import Image from 'next/image'
import { ComponentRender } from '@/components/render/ComponentRender'
import { photoOf } from '@/lib/catalog/media'
import { useI18n } from '@/lib/i18n/context'
import type { Product } from '@/lib/catalog/types'
import type { ProductImage } from '@/lib/supabase/types'

/**
 * La imagen de una pieza, con respaldo.
 *
 * Si hay foto, se sirve con `next/image` —que la redimensiona y la entrega en
 * AVIF o WebP según el navegador—. Si no la hay, se dibuja el render vectorial,
 * que es lo que la tienda usaba antes y sigue siendo correcto para una pieza
 * recién cargada que todavía no tiene fotografía.
 *
 * La foto va **sin fondo ni sombra propios**: el recorte ya viene con canal
 * alfa, y ponerle un fondo la separaría de la superficie de la ficha en vez de
 * apoyarla sobre ella.
 */
export function ProductPhoto({
  product,
  images,
  /** Solo para la imagen grande del primer viewport. */
  priority = false,
  sizes = '(min-width: 1024px) 32vw, (min-width: 640px) 50vw, 100vw',
  className,
  imageClassName,
}: {
  product: Product
  images?: ProductImage[] | null
  priority?: boolean
  sizes?: string
  className?: string
  imageClassName?: string
}) {
  const { locale, t } = useI18n()
  const foto = photoOf(product.slug, product.name, images)

  if (!foto) {
    return (
      <ComponentRender
        {...product.render}
        className={className}
        title={`${product.name} — ${t('product.gallery.front')}`}
      />
    )
  }

  return (
    <span className={`u-product-photo ${className ?? ''}`}>
      <Image
        src={foto.src}
        alt={foto.alt[locale]}
        fill
        priority={priority}
        sizes={sizes}
        draggable={false}
        className={`u-product-photo__asset ${imageClassName ?? ''}`}
      />
    </span>
  )
}

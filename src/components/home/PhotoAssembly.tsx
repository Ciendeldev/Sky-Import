'use client'

import { useEffect, useRef } from 'react'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { onFrame, useScrollProgress, usePrefersReducedMotion } from '@/lib/motion'
import type { Product } from '@/lib/catalog/types'

/**
 * LA PLACA SE MONTA AL DESPLAZAR — CON LA FOTO REAL
 *
 * Acá vivía un despiece en 3D: siete piezas de geometría escrita a mano que
 * se separaban con el scroll. La interacción estaba buena; el objeto no. Era
 * un dibujo, y en una tienda de importación lo que hay que enseñar es la
 * pieza que se entrega.
 *
 * La foto sola tampoco alcanzaba: quieta, la sección perdía lo único que la
 * hacía memorable. Así que vuelve el montaje, pero sobre la fotografía.
 *
 * CÓMO. La misma imagen se pinta seis veces, y a cada copia se le recorta una
 * franja horizontal distinta con `clip-path`. El recorte viaja CON la copia
 * —es su propio sistema de coordenadas—, así que al desplazar cada franja se
 * lleva su trozo de placa. Separadas, la tarjeta está desarmada; con las seis
 * en su sitio, los recortes vuelven a encajar y lo que queda es la fotografía
 * original, pixel por pixel. No hay truco de dibujo en ningún cuadro: lo que
 * se arma es la placa de verdad.
 *
 * POR QUÉ CON `onFrame` Y NO CON UN `scroll`. Con desplazamiento suave los
 * eventos de scroll se pierden y la pieza se queda a medio montar. El avance
 * se LEE del rectángulo en cada cuadro, sobre el único `requestAnimationFrame`
 * de la casa, y se amortigua para que no dé tirones.
 *
 * El DOM no cambia: las seis franjas existen siempre y solo se les mueve el
 * `transform`. Nada de estado de React por cuadro, que con seis capas a
 * sesenta cuadros por segundo sería un incendio.
 */

/** Seis franjas: bastantes para que se lea como un montaje, pocas para que no parezca picado. */
const FRANJAS = 6

/** Separación máxima, en porcentaje del alto de la caja. */
const SALTO_Y = 6
/** Deriva lateral: es lo que hace que se lea como profundidad y no como corte. */
const SALTO_X = 2.2

export function PhotoAssembly({
  product,
  hint,
  className,
}: {
  product: Product
  hint: string
  className?: string
}) {
  const caja = useRef<HTMLDivElement>(null)
  const franjas = useRef<(HTMLDivElement | null)[]>([])
  const progreso = useScrollProgress(caja)
  const quieto = usePrefersReducedMotion()

  useEffect(() => {
    if (quieto) {
      // Sin movimiento: montada y en paz. Ni un `transform` que animar.
      for (const f of franjas.current) if (f) f.style.transform = ''
      return
    }

    let actual = 0
    return onFrame(() => {
      /**
       * La ventana de montaje: del 12 % al 48 % del recorrido.
       *
       * `useScrollProgress` marca 0,5 cuando la sección está centrada en
       * pantalla, así que el 48 % la deja MONTADA justo cuando el visitante la
       * tiene delante. Con una ventana más larga la placa terminaba de armarse
       * cuando ya se estaba yendo por arriba: se veía en pedazos todo el rato
       * que estaba a la vista, que es exactamente al revés de lo que se busca.
       */
      const bruto = Math.min(1, Math.max(0, (progreso.current - 0.12) / 0.36))
      actual += (bruto - actual) * 0.12
      // Suavizado de Hermite: arranca y termina sin golpe.
      const t = actual * actual * (3 - 2 * actual)

      for (let i = 0; i < FRANJAS; i += 1) {
        const nodo = franjas.current[i]
        if (!nodo) continue
        // Centrado: las franjas de arriba suben y las de abajo bajan.
        const k = i - (FRANJAS - 1) / 2
        const abierto = 1 - t
        nodo.style.transform = `translate3d(${k * SALTO_X * abierto}%, ${
          k * SALTO_Y * abierto
        }%, 0)`
      }
    })
  }, [progreso, quieto])

  return (
    <div ref={caja} className={`relative ${className ?? ''}`}>
      {Array.from({ length: FRANJAS }, (_, i) => {
        const desde = (i / FRANJAS) * 100
        const hasta = 100 - ((i + 1) / FRANJAS) * 100
        return (
          <div
            key={i}
            ref={(nodo) => {
              franjas.current[i] = nodo
            }}
            className="absolute inset-0 will-change-transform"
            // Medio punto de solape: sin él, el redondeo del navegador deja
            // una costura clara entre franjas cuando la placa está montada.
            style={{ clipPath: `inset(${Math.max(0, desde - 0.5)}% 0 ${Math.max(0, hasta - 0.5)}% 0)` }}
            aria-hidden={i > 0}
          >
            <ProductPhoto
              product={product}
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="absolute inset-0"
              imageClassName="h-full w-full object-contain p-8 lg:p-12"
            />
          </div>
        )
      })}

      <p className="u-label absolute bottom-4 left-4 flex items-center gap-2">
        <span className="inline-block h-px w-6 bg-accent" aria-hidden="true" />
        {hint}
      </p>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Price } from '@/components/ui/Price'

/**
 * BARRA FIJA DE COMPRA — solo en teléfono
 *
 * Aparece cuando el bloque de compra sale de pantalla y se retira cuando vuelve.
 * No está siempre puesta: mientras la acción real se ve, una copia flotante
 * encima es ruido que tapa contenido.
 *
 * La detección es un `IntersectionObserver` sobre un centinela de un píxel, no
 * un escuchador de scroll: es lo que el resto de la tienda ya hace (ver
 * `src/lib/motion.ts`) y no cuesta un cálculo por cuadro.
 *
 * Deja aire abajo para el gesto de inicio de iOS con `env(safe-area-inset-bottom)`,
 * y el objetivo táctil nunca baja de 44 px.
 */
export function StickyBuyBar({
  href,
  priceUsd,
  label,
  soldOut,
}: {
  href: string | null
  priceUsd: number
  label: string
  soldOut: boolean
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = sentinel.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Se muestra cuando el centinela quedó ARRIBA del viewport, es decir
        // cuando ya pasamos de largo el bloque de compra. Si está por debajo
        // —todavía no llegamos— no hace falta.
        setVisible(!entry!.isIntersecting && entry!.boundingClientRect.top < 0)
      },
      { threshold: 0 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />

      {href && !soldOut ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 backdrop-blur-sm transition-transform duration-300 ease-rail lg:hidden"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(105%)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          // Mientras está guardada no debe ser alcanzable con el tabulador.
          inert={!visible}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Price usd={priceUsd} className="shrink-0 font-mono text-[0.9375rem] font-medium" />
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="u-btn u-btn-solid ml-auto min-h-[44px] flex-1 justify-center"
            >
              {label}
            </a>
          </div>
        </div>
      ) : null}
    </>
  )
}

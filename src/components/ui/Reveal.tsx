'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Entrada contenida: una sola vez, nunca en cada scroll.
 *
 * El efecto escribe el atributo DIRECTAMENTE en el nodo en vez de pasar por
 * estado de React. Dos motivos: no provoca un segundo render por cada elemento
 * que entra —con veinte fichas en pantalla eso se nota— y si
 * `IntersectionObserver` no existiera, mostrar el contenido es una operación de
 * DOM y no un cambio de estado.
 *
 * Observa un contenedor propio y no el elemento desplazado, porque un elemento
 * movido dentro de una máscara con `overflow: hidden` nunca se ve a sí mismo
 * entrar y el observador no dispararía jamás.
 *
 * El escalonado tiene tope: a partir del octavo hermano entran todos juntos,
 * para no pasarnos del presupuesto de animaciones simultáneas.
 */
export function Reveal({
  children,
  delayIndex = 0,
  as: Tag = 'div',
  className,
  variant = 'enter',
}: {
  children: ReactNode
  delayIndex?: number
  as?: 'div' | 'li' | 'section' | 'span'
  className?: string
  variant?: 'enter' | 'draw'
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const show = () => node.setAttribute('data-in', 'true')

    if (typeof IntersectionObserver === 'undefined') {
      show()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show()
            observer.disconnect()
          }
        }
      },
      /**
       * El margen superior enorme no es un truco: define QUÉ cuenta como
       * «ya entró».
       *
       * Un `IntersectionObserver` solo avisa si existe un cuadro en el que el
       * elemento se cruza con la raíz. Si alguien arrastra la barra de scroll,
       * pulsa Fin o llega por un ancla, la página salta y hay elementos que
       * pasan de estar debajo del pliegue a estar encima sin cruzarse nunca:
       * el observador no dispara y esos bloques se quedan en opacidad 0 para
       * siempre. La página queda en negro y no hay forma de recuperarla salvo
       * recargar.
       *
       * Con la raíz estirada cien mil píxeles hacia arriba, «encima del
       * pliegue» también es intersección. El recorte de abajo se conserva: por
       * debajo sigue haciendo falta que entre de verdad para que la entrada se
       * vea, que es para lo que existe.
       */
      { rootMargin: '100000px 0px -12% 0px', threshold: 0.08 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const delay = Math.min(delayIndex, 7) * 70

  return (
    <Tag
      // @ts-expect-error — el ref es del elemento concreto que elija `as`.
      ref={ref}
      className={`${variant === 'draw' ? 'u-draw' : 'u-enter'} ${className ?? ''}`}
      style={{ '--enter-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}

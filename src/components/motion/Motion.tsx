'use client'

import {
  Fragment,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'
import {
  useCountUp,
  useInView,
  useMagnetic,
  useParallax,
  useTilt,
} from '@/lib/motion'

/**
 * PRIMITIVAS DE MOVIMIENTO
 *
 * Las piezas que se repiten por toda la tienda. Todas comparten las dos curvas
 * de la casa, escalonan con tope y se apagan de verdad con
 * `prefers-reduced-motion` — no se acortan.
 */

// ───────────────────────────────────────────────────────────── entrada suave

export function Reveal({
  children,
  delayIndex = 0,
  as: Tag = 'div',
  className,
  from = 'up',
  distance = 22,
  style,
}: {
  children: ReactNode
  delayIndex?: number
  as?: ElementType
  className?: string
  from?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'none'
  distance?: number
  style?: CSSProperties
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
      // Mismo motivo que en `Reveal`: un salto de scroll no puede dejar
      // contenido invisible. Ver el razonamiento completo allí.
      { rootMargin: '100000px 0px -8% 0px', threshold: 0.06 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const offset =
    from === 'up'
      ? `0, ${distance}px`
      : from === 'down'
        ? `0, -${distance}px`
        : from === 'left'
          ? `-${distance}px, 0`
          : from === 'right'
            ? `${distance}px, 0`
            : '0, 0'

  return (
    <Tag
      ref={ref}
      className={`u-enter ${className ?? ''}`}
      style={
        {
          '--enter-delay': `${Math.min(delayIndex, 9) * 62}ms`,
          '--enter-from': `translate3d(${offset}, 0)${from === 'scale' ? ' scale(0.965)' : ''}`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  )
}

// ─────────────────────────────────────────────── titular que sube por palabras

/**
 * Cada palabra sube desde su propia máscara, escalonada. El texto sigue siendo
 * un único nodo legible: los lectores de pantalla lo leen entero y se puede
 * seleccionar y copiar normalmente.
 *
 * Con `alive`, además, una luz cruza el titular cada siete segundos y no para.
 * El barrido va **por palabra** y no sobre el bloque: el recorte a glifos
 * necesita que el elemento contenga el texto directamente, y aquí en medio hay
 * máscaras con `overflow` y transformaciones de entrada. Escalonar el retardo
 * palabra a palabra hace que se lea como una sola luz recorriendo la frase.
 */
export function SplitWords({
  text,
  as: Tag = 'span',
  className,
  delay = 0,
  step = 44,
  start = 'view',
  alive = false,
  aliveDelay = 0,
  aliveStep = 190,
}: {
  text: string
  as?: ElementType
  className?: string
  delay?: number
  step?: number
  /** `view` espera a entrar en pantalla; `now` arranca al montar. */
  start?: 'view' | 'now'
  /** Barrido de luz permanente sobre las palabras. */
  alive?: boolean
  /** Desfase inicial del barrido: encadena varias líneas en una sola pasada. */
  aliveDelay?: number
  aliveStep?: number
}) {
  const ref = useRef<HTMLElement>(null)
  // Sin `rootMargin` propio: se toma el del hook, que cuenta «ya pasó por
  // pantalla» como entrada. Con `'0px'` un salto de scroll dejaba el titular
  // con las palabras escondidas detrás de su máscara, para siempre.
  const inView = useInView(ref, { once: true, threshold: 0.15 })
  const go = start === 'now' || inView
  const words = text.split(' ')

  return (
    <Tag ref={ref} className={className} data-in={go ? 'true' : undefined}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="u-word">
            <span
              className={alive ? 'u-word__in u-alive' : 'u-word__in'}
              style={
                {
                  transitionDelay: `${delay + i * step}ms`,
                  ...(alive ? { '--alive-delay': `${aliveDelay + i * aliveStep}ms` } : null),
                } as CSSProperties
              }
            >
              {word}
            </span>
          </span>
          {/* El espacio va FUERA de la máscara: dentro lo recorta el
              `overflow: hidden` y las palabras salen pegadas. */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}

/** Filete que se dibuja de izquierda a derecha al entrar. */
export function DrawRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <div
      ref={ref}
      className={`u-draw h-px w-full bg-rule ${className ?? ''}`}
      data-in={inView ? 'true' : undefined}
      style={{ '--enter-delay': `${delay}ms` } as CSSProperties}
      aria-hidden="true"
    />
  )
}

// ───────────────────────────────────────────────────────────── imán y vitrina

export function Magnetic({
  children,
  className,
  strength,
  radius,
}: {
  children: ReactNode
  className?: string
  strength?: number
  radius?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useMagnetic(ref, { strength, radius })
  return (
    <span ref={ref} className={`inline-block will-change-transform ${className ?? ''}`}>
      {children}
    </span>
  )
}

export function Tilt({
  children,
  className,
  max,
  scale,
}: {
  children: ReactNode
  className?: string
  max?: number
  scale?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useTilt(ref, { max, scale })
  return (
    <div ref={ref} className={`u-tilt ${className ?? ''}`}>
      {children}
    </div>
  )
}

export function Parallax({
  children,
  className,
  distance,
}: {
  children: ReactNode
  className?: string
  distance?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useParallax(ref, { distance })
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────── contador

export function Counter({
  value,
  className,
  suffix = '',
}: {
  value: number
  className?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, threshold: 0.4 })
  const shown = useCountUp(value, inView)
  return (
    <span ref={ref} className={className} data-tabular>
      {shown}
      {suffix}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────── marquesina

/**
 * Cinta continua. No es un carrusel automático de contenido —eso está
 * prohibido— sino un rótulo en movimiento: no hay nada que perderse si pasa de
 * largo, y se detiene al acercar el puntero.
 */
export function Marquee({
  items,
  className,
  duration = 42,
  reverse = false,
}: {
  items: ReactNode[]
  className?: string
  duration?: number
  reverse?: boolean
}) {
  return (
    <div className={`u-marquee ${className ?? ''}`} aria-hidden="true">
      <div
        className="u-marquee__track"
        style={
          {
            animationDuration: `${duration}s`,
            animationDirection: reverse ? 'reverse' : 'normal',
          } as CSSProperties
        }
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="u-marquee__group">
            {items.map((item, i) => (
              <span key={i} className="u-marquee__item">
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

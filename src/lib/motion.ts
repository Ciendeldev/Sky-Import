'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

/**
 * MOTOR DE MOVIMIENTO
 *
 * Todo lo que se anima por cuadro en esta tienda pasa por **un solo
 * `requestAnimationFrame`**. No hay un bucle por componente: hay una lista de
 * suscriptores y un único bucle que se apaga solo cuando la lista queda vacía o
 * la pestaña se oculta.
 *
 * Es la regla del presupuesto de `DESIGN.md` llevada al código: con diez fichas
 * en pantalla, diez bucles independientes compiten por el mismo hilo y el
 * teléfono empieza a perder cuadros. Uno solo, no.
 *
 * Además, cada gancho de acá:
 *   · solo escribe `transform` y `opacity`;
 *   · se apaga entero con `prefers-reduced-motion`;
 *   · se apaga en punteros gruesos cuando depende del puntero.
 */

type Frame = (time: number, delta: number) => void

const subscribers = new Set<Frame>()
let raf = 0
let last = 0

function loop(time: number) {
  const delta = last === 0 ? 16 : Math.min(48, time - last)
  last = time
  for (const fn of subscribers) fn(time, delta)
  raf = subscribers.size > 0 ? requestAnimationFrame(loop) : 0
}

function start() {
  if (raf === 0 && subscribers.size > 0) {
    last = 0
    raf = requestAnimationFrame(loop)
  }
}

/** Suscribe una función al bucle compartido. Devuelve la baja. */
export function onFrame(fn: Frame): () => void {
  subscribers.add(fn)
  start()
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && raf !== 0) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf !== 0) {
      cancelAnimationFrame(raf)
      raf = 0
    } else {
      start()
    }
  })
}

/** Interpolación suave hacia un objetivo, independiente de la tasa de cuadros. */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp((-lambda * delta) / 1000))
}

// ─────────────────────────────────────────────────────────────── preferencias

/**
 * Las preferencias del sistema se OBSERVAN, no se copian a estado desde un
 * efecto: la fuente de verdad es la consulta de medios y React se suscribe a
 * ella. Así no hay un render de más al montar ni un valor viejo entre medias.
 */
function useMediaQuery(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    [query],
  )
  const get = useCallback(() => window.matchMedia(query).matches, [query])
  const server = useCallback(() => serverValue, [serverValue])
  return useSyncExternalStore(subscribe, get, server)
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', false)
}

export function useFinePointer(): boolean {
  return useMediaQuery('(pointer: fine)', false)
}

// ────────────────────────────────────────────────────────────────── en pantalla

/**
 * ¿Está a la vista?
 *
 * Con `once` —el caso de las entradas— el margen superior se estira hasta lo
 * absurdo a propósito: un salto de scroll (arrastrar la barra, pulsar Fin,
 * llegar por un ancla) puede llevar un elemento de debajo del pliegue a encima
 * del pliegue sin un solo cuadro intermedio, y entonces el observador no
 * dispara nunca y el bloque se queda invisible para siempre. «Ya pasó por
 * pantalla» tiene que contar como «entró». Con `once: false` no se toca,
 * porque ahí sí importa saber si está dentro AHORA.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  opciones: { once?: boolean; rootMargin?: string; threshold?: number } = {},
): boolean {
  const { once = true, threshold = 0.1 } = opciones
  const rootMargin =
    opciones.rootMargin ?? (once ? '100000px 0px -10% 0px' : '0px 0px -10% 0px')
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      // Rama defensiva para navegadores sin observador: se muestra igual, pero
      // fuera del cuerpo del efecto para no encadenar renders.
      queueMicrotask(() => setInView(true))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setInView(false)
          }
        }
      },
      { rootMargin, threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, once, rootMargin, threshold])

  return inView
}

// ────────────────────────────────────────────────────────────────────── imán

/**
 * El elemento se acerca al puntero cuando entra en su radio. Es el gesto que
 * hace que un botón «responda» antes de que lo toques.
 */
export function useMagnetic<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { strength = 0.28, radius = 90 } = {},
) {
  const reduced = usePrefersReducedMotion()
  const fine = useFinePointer()

  useEffect(() => {
    const node = ref.current
    if (!node || reduced || !fine) return

    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let rect: DOMRect | null = null
    let suscrito: (() => void) | null = null

    const paso = (_: number, delta: number) => {
      cx = damp(cx, tx, 14, delta)
      cy = damp(cy, ty, 14, delta)
      if (tx === 0 && ty === 0 && Math.abs(cx) < 0.05 && Math.abs(cy) < 0.05) {
        node.style.transform = ''
        suscrito?.()
        suscrito = null
        return
      }
      node.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`
    }

    const arrancar = () => {
      if (!suscrito) suscrito = onFrame(paso)
    }

    // La geometría se relee al desplazar o redimensionar, no en cada cuadro.
    const invalidar = () => {
      rect = null
    }
    window.addEventListener('scroll', invalidar, { passive: true })
    window.addEventListener('resize', invalidar)

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (!rect) rect = node.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      const reach = Math.max(rect.width, rect.height) / 2 + radius
      const distance = Math.hypot(dx, dy)
      if (distance < reach) {
        const falloff = 1 - distance / reach
        tx = dx * strength * falloff
        ty = dy * strength * falloff
        arrancar()
      } else if (tx !== 0 || ty !== 0) {
        tx = 0
        ty = 0
        arrancar()
      }
    }

    const onLeave = () => {
      tx = 0
      ty = 0
      arrancar()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    return () => {
      suscrito?.()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', invalidar)
      window.removeEventListener('resize', invalidar)
      document.removeEventListener('pointerleave', onLeave)
      node.style.transform = ''
    }
  }, [ref, reduced, fine, strength, radius])
}

// ─────────────────────────────────────────────────────────────────── vitrina

/**
 * Inclinación de vitrina: la pieza gira levemente siguiendo al puntero y su
 * contenido se separa en dos planos. Solo con puntero fino — apilado en
 * teléfono, el paralaje deja de ser profundidad y se vuelve desorden.
 */
export function useTilt<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { max = 7, scale = 1.015, glare = true } = {},
) {
  const reduced = usePrefersReducedMotion()
  const fine = useFinePointer()

  useEffect(() => {
    const node = ref.current
    if (!node || reduced || !fine) return

    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let targetScale = 1
    let currentScale = 1
    let rect: DOMRect | null = null
    let suscrito: (() => void) | null = null

    const paso = (_: number, delta: number) => {
      currentX = damp(currentX, targetX, 12, delta)
      currentY = damp(currentY, targetY, 12, delta)
      currentScale = damp(currentScale, targetScale, 12, delta)
      if (
        targetX === 0 &&
        targetY === 0 &&
        Math.abs(currentX) < 0.05 &&
        Math.abs(currentY) < 0.05 &&
        Math.abs(currentScale - 1) < 0.001
      ) {
        node.style.transform = ''
        suscrito?.()
        suscrito = null
        return
      }
      node.style.transform = `perspective(1000px) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) scale(${currentScale.toFixed(4)})`
    }

    const arrancar = () => {
      if (!suscrito) suscrito = onFrame(paso)
    }

    const onEnter = () => {
      // Una lectura por entrada; el bucle después solo escribe.
      rect = node.getBoundingClientRect()
      targetScale = scale
      arrancar()
    }

    const onMove = (event: PointerEvent) => {
      if (!rect) return
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      targetY = px * max * 2
      targetX = -py * max * 2
      if (glare) {
        node.style.setProperty('--glare-x', `${((px + 0.5) * 100).toFixed(1)}%`)
        node.style.setProperty('--glare-y', `${((py + 0.5) * 100).toFixed(1)}%`)
      }
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
      targetScale = 1
      arrancar()
    }

    node.addEventListener('pointerenter', onEnter)
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)

    return () => {
      suscrito?.()
      node.removeEventListener('pointerenter', onEnter)
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
      node.style.transform = ''
    }
  }, [ref, reduced, fine, max, scale, glare])
}

// ─────────────────────────────────────────────────────────────────── paralaje

/**
 * Desplazamiento ligado al scroll. El avance se lee del rectángulo en cada
 * cuadro y no de eventos de scroll: con desplazamiento suave los eventos se
 * pierden y el elemento queda a medio camino.
 */
export function useParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { distance = 60, axis = 'y' as 'x' | 'y' } = {},
) {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || reduced) return

    let suscrito: (() => void) | null = null
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Fuera de pantalla el bucle se da de baja, no se queda mirando.
          if (entry.isIntersecting) {
            if (!suscrito) suscrito = onFrame(paso)
          } else {
            suscrito?.()
            suscrito = null
          }
        }
      },
      { rootMargin: '20% 0px' },
    )

    function paso() {
      const rect = node!.getBoundingClientRect()
      const centre = rect.top + rect.height / 2
      // −1 arriba de la pantalla, +1 abajo.
      const progress = (centre / window.innerHeight - 0.5) * 2
      const offset = (progress * distance).toFixed(2)
      node!.style.transform =
        axis === 'y' ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`
    }

    observer.observe(node)

    return () => {
      suscrito?.()
      observer.disconnect()
      node.style.transform = ''
    }
  }, [ref, reduced, distance, axis])
}

// ────────────────────────────────────────────────────────────────── contador

/** Cifra que sube hasta su valor. Con movimiento reducido aparece directamente. */
export function useCountUp(target: number, active: boolean, duration = 900): number {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    if (!active || done.current || reduced) return
    let elapsed = 0
    const stop = onFrame((_, delta) => {
      elapsed += delta
      const p = Math.min(1, elapsed / duration)
      // Salida sedosa, sin rebote.
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p >= 1) {
        done.current = true
        stop()
      }
    })
    return stop
  }, [active, target, duration, reduced])

  // Con movimiento reducido la cifra no cuenta: aparece. No hace falta estado
  // para eso, así que se resuelve en el render.
  return reduced ? target : value
}

// ──────────────────────────────────────────────────────── progreso de scroll

/** Avance 0→1 de un elemento cruzando la pantalla, para efectos ligados. */
export function useScrollProgress<T extends HTMLElement>(ref: RefObject<T | null>): RefObject<number> {
  const progress = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    let visible = false
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible = entry.isIntersecting
      },
      { rootMargin: '30% 0px' },
    )
    observer.observe(node)

    const stop = onFrame(() => {
      if (!visible) return
      const rect = node.getBoundingClientRect()
      const span = rect.height + window.innerHeight
      progress.current = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / span))
    })

    return () => {
      stop()
      observer.disconnect()
    }
  }, [ref])

  return progress
}

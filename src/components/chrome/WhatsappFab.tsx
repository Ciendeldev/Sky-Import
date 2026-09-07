'use client'

import { useEffect, useState } from 'react'
import { CONTACT, hasWhatsapp } from '@/config/site'
import { useI18n } from '@/lib/i18n/context'
import { useIntroDone } from '@/lib/useIntroDone'
import { useUi } from '@/lib/ui'
import { whatsappUrl } from '@/lib/whatsapp'

/**
 * BOTÓN FLOTANTE DE WHATSAPP
 *
 * En esta tienda no es un adorno: WhatsApp **es** la caja. No hay pasarela de
 * pago, y toda venta termina en esa conversación. Que estuviera solo dentro de
 * la ficha y del checkout dejaba fuera al que llega a la portada con una duda
 * y no quiere recorrer el catálogo para preguntarla.
 *
 * Tres decisiones que no son obvias:
 *
 *   1. **No aparece hasta que la cortina de entrada terminó.** Un botón fijo
 *      pintándose por encima de la intro rompe la puesta en escena, y en móvil
 *      además roba el primer toque.
 *   2. **Se aparta cuando el carrito está abierto.** El panel del carrito
 *      ocupa el mismo rincón; superpuestos, el botón queda encima del «Quitar»
 *      de la última línea y se toca sin querer.
 *   3. **En el checkout no se dibuja.** Ahí ya hay una barra fija con el botón
 *      de enviar el pedido; dos verdes compitiendo por el mismo gesto es una
 *      forma segura de que el cliente toque el que no cierra la venta.
 *
 * Si `CONTACT.whatsapp` está vacío, no existe: la casa nunca publica un enlace
 * de contacto que no lleva a ninguna parte.
 */
export function WhatsappFab() {
  const { t } = useI18n()
  const introLista = useIntroDone()
  const cartOpen = useUi((s) => s.cartOpen)
  const [enCheckout, setEnCheckout] = useState(false)

  // La ruta se mira en el cliente porque este componente vive en el layout,
  // por encima de la página: no recibe params y no debe forzar un render de
  // servidor por leer `usePathname` en un árbol que puede ser estático.
  useEffect(() => {
    const mirar = () => setEnCheckout(/\/(checkout|carrito)$/.test(window.location.pathname))
    mirar()
    window.addEventListener('popstate', mirar)
    // Next navega sin recargar; el intervalo corto es más barato y más fiable
    // que enganchar el router para una comprobación de una expresión regular.
    const id = window.setInterval(mirar, 400)
    return () => {
      window.removeEventListener('popstate', mirar)
      window.clearInterval(id)
    }
  }, [])

  if (!hasWhatsapp || !introLista || enCheckout) return null

  return (
    <a
      href={whatsappUrl(t('wa.fabMessage'))}
      target="_blank"
      rel="noopener noreferrer"
      className="u-wa-fab"
      data-hidden={cartOpen ? 'true' : undefined}
      aria-label={`${t('wa.fabLabel')} — ${CONTACT.whatsappDisplay}`}
    >
      {/* Marca denominativa dibujada, no un archivo: una imagen más que pedir
          para un botón que tiene que estar desde el primer cuadro. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.28.86 5.84 2.42a8.2 8.2 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.24-8.24Zm-4.5 4.4c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.62 2.63 1.02 3.16.82 3.73.77.57-.05 1.85-.75 2.11-1.48.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.36-.31-.16-1.85-.91-2.13-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.37.24-.68.08-.31-.16-1.32-.49-2.51-1.55-.93-.83-1.55-1.85-1.74-2.16-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.19.21-.32.31-.53.1-.21.05-.39-.03-.55-.08-.16-.7-1.7-.96-2.32-.25-.61-.5-.53-.7-.54h-.6Z"
        />
      </svg>
    </a>
  )
}

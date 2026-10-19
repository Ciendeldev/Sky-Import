'use client'

import { useCatalog } from '@/lib/catalog/context'
import { CURRENCIES, formatMoney } from '@/lib/money'

/**
 * EL PRECIO EN TRES MONEDAS
 *
 * Los tres importes se imprimen en el HTML del servidor y solo uno queda visible;
 * la elección la gobierna `html[data-currency]` desde CSS. Ventajas de hacerlo
 * así en lugar de convertir en el cliente:
 *
 *   · cero parpadeo — el valor correcto está pintado desde el primer cuadro;
 *   · cero desajuste de hidratación — no hay nada que recalcular;
 *   · la página sigue siendo estática — no hace falta leer una cookie en servidor.
 *
 * Solo la moneda visible entra en el árbol de accesibilidad, porque `display:none`
 * saca a las otras dos.
 *
 * Las tasas son las del catálogo vigente, las mismas con las que `place_order`
 * graba el pedido: el guaraní que se ve es el que se registra.
 */

export function Price({
  usd,
  className,
  strike = false,
}: {
  usd: number
  className?: string
  strike?: boolean
}) {
  const { fx } = useCatalog()
  return (
    <span className={className} data-tabular data-price>
      {CURRENCIES.map((currency) => (
        <span key={currency} data-cur={currency} className={strike ? 'line-through' : undefined}>
          {formatMoney(usd, currency, fx)}
        </span>
      ))}
    </span>
  )
}

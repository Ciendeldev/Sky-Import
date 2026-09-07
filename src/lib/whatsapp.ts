/**
 * PLANTILLAS DE WHATSAPP
 *
 * El único cierre de venta de la tienda. No hay pasarela: el pedido se arma
 * acá, se codifica con `encodeURIComponent` y se abre en la conversación.
 *
 * Dos formatos, y ninguno más:
 *
 *   · `productMessage` — compra directa desde la ficha, saltándose el carrito.
 *   · `orderMessage`   — pedido completo desde el checkout, con datos de entrega.
 *
 * Reglas que este módulo respeta:
 *
 *   1. **Todo importe va en guaraníes.** Es la moneda en la que se cierra la
 *      operación por WhatsApp, sin importar en cuál esté mirando la tienda.
 *   2. **El USD sigue siendo la fuente.** Cada monto entra en dólares y se
 *      convierte con la tasa vigente, una sola vez, acá.
 *   3. **Las líneas vacías no se imprimen.** Cupón, notas y dirección
 *      desaparecen del mensaje si no aplican, en vez de dejar un campo con un
 *      guion que el vendedor tiene que interpretar.
 *   4. Es un módulo **puro**: no toca el DOM, no lee estado global y no abre
 *      ventanas. Devuelve texto. Quien lo abre es el componente.
 *   5. **Ningún emoji. Solo caracteres del plano básico.**
 *
 *      Los mensajes llegaban con un rombo con interrogación en el lugar de
 *      cada emoji. El código fuente estaba limpio y el paquete compilado
 *      también —se comprobaron los dos, byte a byte—, así que lo que se rompe
 *      está en el traspaso del enlace del navegador a la aplicación: fuera de
 *      este proyecto y fuera de su alcance.
 *
 *      Pero la captura del cliente dejó una pista que sí sirve. El filete y el
 *      punto medio llegaron PERFECTOS, y todos los emojis llegaron rotos. Los
 *      dos primeros viven en el plano básico —tres bytes o menos en UTF-8—;
 *      los emojis, fuera de él. Así que la regla no es una corazonada: entra
 *      solo lo que ya demostró sobrevivir el viaje.
 *
 *      La estructura la llevan la negrita de WhatsApp, la sangría y los
 *      filetes. Un mensaje de venta que llega con veinte rombos negros da
 *      peor impresión que uno sobrio que llega intacto en cualquier teléfono.
 */

import { CONTACT, SITE } from '@/config/site'
import { convert } from '@/lib/money'
import type { Locale } from '@/lib/i18n/locales'

/** Agrupa la parte entera con puntos: 9242000 -> "9.242.000". */
function groupThousands(value: number): string {
  const digits = Math.max(0, Math.round(value)).toString()
  let out = ''
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i
    out += digits[i]
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += '.'
  }
  return out
}

/**
 * Importe en guaraníes, sin símbolo: la plantilla ya escribe «Gs.» delante.
 * El redondeo de vitrina (al millar) lo hace `convert`, que es el mismo que
 * usa toda la tienda — el mensaje no puede decir un número distinto del que
 * el cliente vio en pantalla.
 */
export function pyg(usd: number): string {
  return groupThousands(convert(usd, 'PYG'))
}

/**
 * Numeración de las líneas del pedido.
 *
 * Eran teclas de emoji, que son tres codepoints cada una y llegaban
 * rotas. Un número y un punto se leen igual y no se rompen en ningún lado.
 */
function keycap(index: number): string {
  return `${index + 1}.`
}

const RULE = '━━━━━━━━━━━━━━━━━━'

/**
 * Viñeta de dato. Punto medio (U+00B7): late en latín-1 y llegó intacto en la
 * captura del cliente, que es toda la prueba que hay de que un carácter
 * sobrevive el viaje hasta WhatsApp.
 */
const DOT = '·'

/** Enlace `wa.me` con el mensaje ya codificado. */
export function whatsappUrl(message: string): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}

/** URL pública y absoluta de una ficha — la que se pega en el mensaje. */
export function productUrl(slug: string, locale: Locale = 'es'): string {
  return `${SITE.origin}/${locale}/producto/${slug}`
}

// ═══════════════════════════════════════════ 1 · compra directa desde la ficha

export interface ProductMessageInput {
  name: string
  /** SKU de la variante elegida, o el código de referencia del producto. */
  sku: string
  slug: string
  qty: number
  /** Precio unitario en USD; se convierte a guaraníes acá. */
  unitPriceUsd: number
  /** Etiqueta de la variante, si el cliente eligió una. */
  variantLabel?: string
  locale?: Locale
}

export function productMessage(input: ProductMessageInput): string {
  const { name, sku, slug, qty, unitPriceUsd, variantLabel, locale = 'es' } = input
  const titulo = variantLabel ? `${name} (Var: ${variantLabel})` : name

  return [
    '¡Hola! Me interesa este producto de *Sky Import*',
    '',
    '*PRODUCTO*',
    RULE,
    `*${titulo}*`,
    `${DOT} Código: ${sku}`,
    `${DOT} Cantidad: ${qty} u.`,
    `${DOT} Precio: Gs. ${pyg(unitPriceUsd)}`,
    `${DOT} Link: ${productUrl(slug, locale)}`,
    RULE,
    `*TOTAL: Gs. ${pyg(unitPriceUsd * qty)}*`,
    '',
    '¿Me confirman si tienen disponible para coordinar la entrega?',
  ].join('\n')
}

// ══════════════════════════════════════ 2 · pedido completo desde el checkout

export interface OrderLineInput {
  name: string
  sku: string
  qty: number
  /** Total de la línea en USD (precio unitario × cantidad). */
  subtotalUsd: number
  variantLabel?: string
}

export interface OrderMessageInput {
  lines: OrderLineInput[]
  subtotalUsd: number
  /** Descuento en USD. Si es 0 o no hay código, la línea del cupón no se imprime. */
  discountUsd?: number
  couponCode?: string
  /** Nombre de la zona tal como se le mostró al cliente. */
  zoneName: string
  totalUsd: number
  customer: {
    firstName: string
    lastName: string
    phone: string
    /** Dirección exacta. Vacía en retiro por el local. */
    address?: string
    /** Ciudad o zona escrita por el cliente, si la puso aparte. */
    city?: string
    notes?: string
  }
  /** Número de pedido asignado al registrarlo. Se imprime si existe. */
  orderNumber?: string
}

export function orderMessage(input: OrderMessageInput): string {
  const {
    lines,
    subtotalUsd,
    discountUsd = 0,
    couponCode,
    zoneName,
    totalUsd,
    customer,
    orderNumber,
  } = input

  const out: string[] = ['¡Hola! Quiero confirmar este pedido de *Sky Import*']

  if (orderNumber) out.push('', `Pedido ${orderNumber}`)

  out.push('', '*MI PEDIDO*', RULE)

  lines.forEach((line, i) => {
    // Una línea en blanco entre piezas: en WhatsApp, sin ella, el bloque se
    // lee como un párrafo continuo y los códigos se pierden.
    if (i > 0) out.push('')
    const titulo = line.variantLabel
      ? `*${line.name}* (Var: ${line.variantLabel})`
      : `*${line.name}*`
    out.push(`${keycap(i)} ${titulo}`)
    out.push(`   ${DOT} Código: ${line.sku}`)
    out.push(`   ${DOT} Cantidad: ${line.qty} u.  —  Gs. ${pyg(line.subtotalUsd)}`)
  })

  out.push(RULE)
  out.push(`Subtotal: Gs. ${pyg(subtotalUsd)}`)

  // El cupón solo existe en el mensaje si de verdad descontó algo.
  if (discountUsd > 0 && couponCode) {
    out.push(`Cupón (${couponCode.toUpperCase()}): −Gs. ${pyg(discountUsd)}`)
  }

  // El envío no lleva importe: depende del peso y del destino, y se cierra en
  // esta misma conversación. El total se rotula por lo que de verdad es —las
  // piezas— para que nadie lo lea como el importe final a pagar.
  out.push(`Envío a ${zoneName}: lo coordinamos por acá`)
  out.push(`*TOTAL DE LAS PIEZAS: Gs. ${pyg(totalUsd)}*`)

  out.push('', RULE, '*DATOS DE ENTREGA*')
  out.push(`${DOT} Nombre: ${customer.firstName} ${customer.lastName}`.trimEnd())
  out.push(`${DOT} Teléfono: ${customer.phone}`)

  // Dirección y ciudad viajan juntas en una línea; en retiro por el local no
  // hay dirección que poner, así que se imprime la zona y nada más.
  const destino = [customer.address, customer.city].map((v) => v?.trim()).filter(Boolean).join(', ')
  out.push(`${DOT} Ciudad / Dirección: ${destino || zoneName}`)

  if (customer.notes?.trim()) out.push(`${DOT} Notas: ${customer.notes.trim()}`)

  out.push('', '¿Me confirman el pedido y coordinamos la entrega?')

  return out.join('\n')
}

// ══════════════════════════════════════════════ 3 · teléfono del cliente → wa.me

/**
 * Normaliza un teléfono paraguayo al formato que `wa.me` exige: código de país
 * y nada más, sin signos y **sin el cero de tránsito**.
 *
 * Hace falta porque el cliente escribe su número como lo escribe todo el
 * mundo acá —`0994 222 542`— y `wa.me/0994222542` no abre ninguna
 * conversación: WhatsApp lee ese cero como parte del código de país y no
 * encuentra a nadie. El panel enlazaba el número tal cual salía del checkout,
 * así que el botón de contactar al cliente estaba roto en todos los pedidos.
 *
 * Solo toca lo que reconoce. Un número que ya trae código de país —el 595
 * propio, o el 55 de un cliente brasileño cruzando el puente— sale intacto.
 */
export function waPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('595')) return digits
  if (digits.startsWith('0')) return `595${digits.slice(1)}`
  // Ocho o nueve dígitos sueltos es un número nacional escrito sin el cero.
  if (digits.length >= 8 && digits.length <= 9) return `595${digits}`
  return digits
}

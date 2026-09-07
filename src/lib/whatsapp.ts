/** Plantillas de venta: bloques breves, emojis Unicode y negritas nativas.
 * Importes derivados del USD y codificación UTF-8 una sola vez al crear el enlace.
 * La vista previa externa puede sustituir emojis; el enlace oficial directo
 * conserva el texto completo que reciben la aplicación y WhatsApp Web.
 * Se generan en el idioma del cliente; envío y disponibilidad se confirman en la conversación.
 */

import { SITE, whatsappLink } from '@/config/site'
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

const DOT = '·'

/** Una única ruta de salida evita que los CTA codifiquen el texto de formas distintas. */
export function whatsappUrl(message: string): string {
  return whatsappLink(message)
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
  const pt = locale === 'pt'
  const titulo = variantLabel ? `${name} (Var: ${variantLabel})` : name

  return [
    pt ? 'Olá, equipe da *Sky Import*! 👋' : '¡Hola, equipo de *Sky Import*! 👋',
    pt ? 'Encontrei esta peça no site e gostaria de comprar:' : 'Vi esta pieza en la web y me gustaría comprarla:',
    '',
    pt ? '🖥️ *PRODUTO*' : '🖥️ *PRODUCTO*',
    `*${titulo}*`,
    `${DOT} Código: ${sku}`,
    `${DOT} ${pt ? 'Quantidade' : 'Cantidad'}: ${qty} u.`,
    `${DOT} ${pt ? 'Preço unitário' : 'Precio unitario'}: Gs. ${pyg(unitPriceUsd)}`,
    '',
    `💰 *TOTAL: Gs. ${pyg(unitPriceUsd * qty)}*`,
    '',
    `🔗 ${productUrl(slug, locale)}`,
    '',
    pt
      ? 'Podem confirmar a disponibilidade e me orientar sobre o pagamento e a entrega? Obrigado! 🙌'
      : '¿Me confirman la disponibilidad y cómo coordinamos el pago y la entrega? ¡Gracias! 🙌',
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
  locale?: Locale
  deliveryMode?: 'shipping' | 'pickup'
  lines: OrderLineInput[]
  subtotalUsd: number
  /** Descuento en USD. Si es 0 no se imprime; el código del cupón es opcional. */
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
  const { customer, locale = 'es', discountUsd = 0, couponCode } = input
  const pt = locale === 'pt'
  const heading = input.orderNumber ? `*Pedido ${input.orderNumber}*` : `*${pt ? 'Meu pedido' : 'Mi pedido'}*`
  const out = [
    `${pt ? 'Olá' : '¡Hola'}, Sky Import! 👋 ${heading}`,
    '',
    ...input.lines.map((line) => {
      const variant = line.variantLabel ? ` (Var: ${line.variantLabel})` : ''
      return `🛒 ${line.qty} × *${line.name}*${variant} · ${line.sku} — Gs. ${pyg(line.subtotalUsd)}`
    }),
    '',
  ]
  if (discountUsd > 0) {
    out.push(`Subtotal: Gs. ${pyg(input.subtotalUsd)}`)
    const label = couponCode?.trim()
      ? `${pt ? 'Cupom' : 'Cupón'} (${couponCode.trim().toUpperCase()})`
      : pt ? 'Desconto' : 'Descuento'
    out.push(`${label}: −Gs. ${pyg(discountUsd)}`)
  }
  const fullName = [customer.firstName.trim(), customer.lastName.trim()].filter(Boolean).join(' ')
  out.push(`💰 *Total: Gs. ${pyg(input.totalUsd)}*`, `👤 ${fullName} · ${customer.phone.trim()}`)
  if (input.deliveryMode === 'pickup') {
    out.push(pt ? '🏬 Retirada na loja' : '🏬 Retiro en el local')
  } else {
    const seen = new Set<string>()
    const destination = [input.zoneName, customer.city, customer.address].map(v => v?.trim()).filter((part): part is string => {
      if (!part) return false
      const key = part.replace(/\s+/g, ' ').toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (destination.length) out.push(`📍 ${destination.join(' · ')}`)
    out.push(pt ? '🚚 Frete a combinar, não incluído.' : '🚚 Envío a coordinar, no incluido.')
  }
  if (customer.notes?.trim()) out.push(`📝 ${customer.notes.trim()}`)
  out.push('', pt ? 'Podem confirmar o estoque e como pagar? 🙌' : '¿Me confirman disponibilidad y cómo pagar? 🙌')
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

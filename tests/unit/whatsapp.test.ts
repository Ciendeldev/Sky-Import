import { describe, expect, it } from 'vitest'
import { orderMessage, productMessage, productUrl, pyg, waPhone, whatsappUrl } from '@/lib/whatsapp'
import { CONTACT, SITE, whatsappLink } from '@/config/site'
import { DICTIONARY } from '@/lib/i18n/dictionary'

const product = { name: 'GeForce RTX 5080 16 GB', sku: 'SI-VGA-0112', slug: 'geforce-rtx-5080-16gb', qty: 2, unitPriceUsd: 1249 }
const order = {
  lines: [{ name: product.name, sku: product.sku, qty: 2, subtotalUsd: 2498 }],
  subtotalUsd: 2498, totalUsd: 2498, zoneName: 'Asunción', orderNumber: 'SI-1042',
  customer: { firstName: 'Ana', lastName: 'Giménez', phone: '+595 981 111 222', address: 'Av. España 1234', city: 'Asunción' },
}

describe('importes y datos del pedido', () => {
  it('convierte desde USD y mantiene el redondeo de vitrina', () => {
    expect(pyg(100)).toBe('740.000')
    expect(pyg(1249)).toBe('9.243.000')
    expect(pyg(-5)).toBe('0')
    const message = productMessage(product)
    expect(message).toContain('Precio unitario: Gs. 9.243.000')
    expect(message).toContain('*TOTAL: Gs. 18.485.000*')
  })
  it('conserva cantidades, SKU, número y datos del cliente separados del resumen', () => {
    const message = orderMessage(order)
    expect(message).toContain('*Pedido SI-1042*')
    expect(message).toContain('🛒 2 × *GeForce RTX 5080 16 GB*')
    expect(message).toContain('· SI-VGA-0112')
    expect(message).toContain('2 ×')
    expect(message).toContain('— Gs. 18.485.000')
    expect(message).toContain('*Total: Gs. 18.485.000*')
    expect(message).toContain('👤 Ana Giménez')
    expect(message).toContain('· +595 981 111 222')
    expect(message).toContain('📍 Asunción · Av. España 1234')
  })
  it('incluye variantes sin perder los códigos', () => {
    expect(productMessage({ ...product, variantLabel: 'Blanco' })).toContain('(Var: Blanco)')
    expect(orderMessage({ ...order, lines: [{ ...order.lines[0]!, variantLabel: 'Blanco' }] })).toContain('(Var: Blanco)')
  })
  it('imprime el cupón solo cuando descontó e identifica el total neto', () => {
    expect(orderMessage(order)).not.toContain('Cupón (')
    expect(orderMessage({ ...order, couponCode: 'sky10', discountUsd: 0 })).not.toContain('Cupón (')
    const message = orderMessage({ ...order, couponCode: 'sky10', discountUsd: 249.8, totalUsd: 2248.2 })
    expect(message).toContain('Cupón (SKY10): −Gs. 1.849.000')
    expect(message).toContain('*Total: Gs. 16.637.000*')
  })
  it('el envío no promete una tarifa ni se confunde con el total', () => {
    expect(orderMessage(order)).toContain('Envío a coordinar, no incluido.')
    expect(orderMessage(order)).not.toMatch(/gratis|bonificado/i)
  })
  it('el retiro no aparece como un envío ni arrastra la dirección anterior', () => {
    const message = orderMessage({ ...order, deliveryMode: 'pickup', zoneName: 'Retiro en el local' })
    expect(message).toContain('🏬 Retiro en el local')
    expect(message).not.toMatch(/Envío|Ciudad \/ Dirección|Av. España/)
  })
  it('omite número y notas vacíos', () => {
    const message = orderMessage({ ...order, orderNumber: undefined, customer: { ...order.customer, notes: '  ' } })
    expect(message).not.toContain('*Pedido SI-')
    expect(message).not.toContain('*NOTAS*')
    expect(message).not.toContain('undefined')
    expect(orderMessage({ ...order, customer: { ...order.customer, notes: ' Tocar timbre ' } })).toContain('📝 Tocar timbre')
  })
})

describe('idioma y estructura', () => {
  it.each(['es', 'pt'] as const)('redacta el saludo y ambos mensajes en %s', (locale) => {
    const direct = productMessage({ ...product, locale })
    const checkout = orderMessage({ ...order, locale })
    const greeting = DICTIONARY[locale]['wa.fabMessage']
    for (const message of [direct, checkout, greeting]) {
      expect(message).toContain('Sky Import')
      expect(message).toContain('👋')
      expect(message).toContain('\n')
      expect(message).not.toContain('━━━━━━━━')
      expect(message).not.toContain('\uFFFD')
    }
    expect(direct).toContain(locale === 'pt' ? '*PRODUTO*' : '*PRODUCTO*')
    expect(checkout).toContain('*Pedido SI-1042*')
    expect(checkout).toContain('🛒 2 ×')
    expect(checkout).toContain(locale === 'pt' ? 'Frete a combinar' : 'Envío a coordinar')
    expect(direct).toContain('/' + locale + '/producto/')
    expect(DICTIONARY[locale]['wa.generic']).toBe(greeting)
  })
})

describe('transporte Unicode a WhatsApp', () => {
  it.each(['es', 'pt'] as const)('conserva emojis, tildes, saltos, porcentajes y signos sin doble codificación (%s)', (locale) => {
    const messages = [
      productMessage({ ...product, locale }),
      orderMessage({ ...order, locale, customer: { ...order.customer, notes: 'Descuento 10% + cable & envío 📦' } }),
      DICTIONARY[locale]['wa.fabMessage'],
      DICTIONARY[locale]['wa.generic'],
    ]
    for (const message of messages) {
      for (const link of [whatsappUrl, whatsappLink]) {
        const url = new URL(link(message))
        expect(url.hostname).toBe('api.whatsapp.com')
        expect(url.pathname).toBe('/send')
        expect(url.searchParams.get('phone')).toBe(CONTACT.whatsapp)
        expect(url.searchParams.get('text')).toBe(message)
        expect(url.href).not.toContain('%EF%BF%BD')
        expect(url.href).toContain('%F0%9F%91%8B')
      }
    }
  })
})

describe('enlaces', () => {
  it('mantiene el origen público y la ruta localizada', () => {
    expect(SITE.origin).toMatch(/^https:\/\/[^/]+$/)
    expect(productUrl(product.slug, 'pt')).toBe(SITE.origin + '/pt/producto/' + product.slug)
  })
  it.each([
    ['0994 222 542', '595994222542'],
    ['994222542', '595994222542'],
    ['+595 994 222 542', '595994222542'],
    ['+55 45 99999 8888', '5545999998888'],
  ])('normaliza %s sin perder el país', (raw, expected) => {
    expect(waPhone(raw)).toBe(expected)
  })
})

describe('pedido compacto', () => {
  it('evita encabezados, subtotal redundante y ciudad duplicada', () => {
    const message = orderMessage(order)
    expect(message.split('\n').length).toBeLessThanOrEqual(10)
    expect(message.length).toBeLessThan(520)
    expect(message).not.toContain('Subtotal:')
    expect(message).not.toMatch(/RESUMEN|DATOS DE/)
    expect(message.match(/Asunción/g)).toHaveLength(1)
  })
  it('conserva todas las líneas y descuentos sin código', () => {
    const message = orderMessage({ ...order, lines: [...order.lines, { name: 'Cable', sku: 'SI-CAB-1', qty: 3, subtotalUsd: 10 }], discountUsd: 100, totalUsd: 2408 })
    expect(message).toContain('🛒 3 × *Cable* · SI-CAB-1')
    expect(message).toContain('Descuento: −Gs. 740.000')
    expect(message).toContain('Subtotal:')
  })
})

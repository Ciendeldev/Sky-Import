import { describe, expect, it } from 'vitest'
import { orderMessage, productMessage, pyg, whatsappUrl } from '@/lib/whatsapp'
import { CONTACT } from '@/config/site'

/**
 * El mensaje de WhatsApp es el único cierre de venta de la tienda: si sale mal
 * formado, se pierde el pedido. Estas pruebas fijan el formato exacto.
 */

describe('pyg', () => {
  it('agrupa los miles con puntos', () => {
    expect(pyg(100)).toBe('740.000')
    expect(pyg(1000)).toBe('7.400.000')
  })

  it('redondea al millar, como el resto de la tienda', () => {
    // 1249 USD × 7400 = 9.242.600 → al millar más cercano.
    expect(pyg(1249)).toBe('9.243.000')
    // El redondeo de vitrina también aplica a los importes chicos: nadie
    // publica ₲ 7.400 en una tienda que cotiza al millar.
    expect(pyg(1)).toBe('7.000')
  })

  it('no imprime importes negativos', () => {
    expect(pyg(-5)).toBe('0')
  })
})

describe('productMessage', () => {
  const base = {
    name: 'GeForce RTX 5080 16 GB',
    sku: 'SI-VGA-0112',
    slug: 'geforce-rtx-5080-16gb',
    qty: 1,
    unitPriceUsd: 1249,
  }

  it('arma el formato de compra directa', () => {
    const message = productMessage(base)
    expect(message).toContain('¡Hola! 👋 Me interesa este producto de *Sky Import*:')
    expect(message).toContain('🛍️ *PRODUCTO*')
    expect(message).toContain('📌 *GeForce RTX 5080 16 GB*')
    expect(message).toContain('🏷️ Cód. SI-VGA-0112   ✖️ 1 u.')
    expect(message).toContain('💵 Precio: Gs. 9.243.000')
    expect(message).toContain('💰 *TOTAL: Gs. 9.243.000*')
    expect(message).toContain('✅ ¿Me confirman si tienen disponible para coordinar la entrega?')
  })

  it('multiplica el total por la cantidad, dejando el unitario intacto', () => {
    const message = productMessage({ ...base, qty: 2 })
    expect(message).toContain('✖️ 2 u.')
    expect(message).toContain('💵 Precio: Gs. 9.243.000')
    expect(message).toContain('💰 *TOTAL: Gs. 18.485.000*')
  })

  it('pega el enlace real de la ficha, no un marcador', () => {
    const message = productMessage(base)
    expect(message).toContain('🔗 Link: https://sky-import.vercel.app/es/producto/geforce-rtx-5080-16gb')
    expect(message).not.toContain('concepto.de')
  })

  it('respeta el idioma en el enlace', () => {
    expect(productMessage({ ...base, locale: 'pt' })).toContain('/pt/producto/')
  })

  it('añade la variante al título solo cuando existe', () => {
    expect(productMessage(base)).not.toContain('(Var:')
    expect(productMessage({ ...base, variantLabel: '2 TB' })).toContain(
      '📌 *GeForce RTX 5080 16 GB (Var: 2 TB)*',
    )
  })
})

describe('orderMessage', () => {
  const base = {
    lines: [
      { name: 'GeForce RTX 5080 16 GB', sku: 'SI-VGA-0112', qty: 1, subtotalUsd: 1249 },
      { name: 'Ryzen 7 9800X3D', sku: 'SI-CPU-0203', qty: 2, subtotalUsd: 960 },
    ],
    subtotalUsd: 2209,
    shippingUsd: 0,
    zoneName: 'Gran Asunción',
    totalUsd: 2209,
    customer: {
      firstName: 'Ana',
      lastName: 'Giménez',
      phone: '+595 981 111 222',
      address: 'Av. España 1234',
      city: 'Asunción',
    },
  }

  it('numera las líneas con los emoji de teclado', () => {
    const message = orderMessage(base)
    expect(message).toContain('1️⃣ *GeForce RTX 5080 16 GB*')
    expect(message).toContain('2️⃣ *Ryzen 7 9800X3D*')
    expect(message).toContain('🏷️ Cód. SI-CPU-0203   ✖️ 2 u.   💵 Gs. 7.104.000')
  })

  it('escribe «¡Gratis!» cuando el envío no cuesta', () => {
    expect(orderMessage(base)).toContain('🚚 Envío (Gran Asunción): ¡Gratis!')
  })

  it('imprime el costo del envío cuando lo hay', () => {
    expect(orderMessage({ ...base, shippingUsd: 8, totalUsd: 2217 })).toContain(
      '🚚 Envío (Gran Asunción): Gs. 59.000',
    )
  })

  it('oculta la línea del cupón si no descontó nada', () => {
    expect(orderMessage(base)).not.toContain('🎟️')
    expect(orderMessage({ ...base, couponCode: 'SKY10', discountUsd: 0 })).not.toContain('🎟️')
  })

  it('imprime el cupón en mayúsculas cuando sí descontó', () => {
    const message = orderMessage({
      ...base,
      couponCode: 'sky10',
      discountUsd: 220.9,
      totalUsd: 1988.1,
    })
    expect(message).toContain('🎟️ Cupón (SKY10): -Gs. 1.635.000')
  })

  it('junta dirección y ciudad en una sola línea', () => {
    expect(orderMessage(base)).toContain('• Ciudad / Dirección: Av. España 1234, Asunción')
  })

  it('cae a la zona cuando no hay dirección — retiro en el local', () => {
    const message = orderMessage({
      ...base,
      zoneName: 'Retiro en el local',
      customer: { firstName: 'Ana', lastName: 'Giménez', phone: '+595 981 111 222' },
    })
    expect(message).toContain('• Ciudad / Dirección: Retiro en el local')
  })

  it('omite las notas si el cliente no escribió ninguna', () => {
    expect(orderMessage(base)).not.toContain('• Notas:')
    expect(orderMessage({ ...base, customer: { ...base.customer, notes: '  ' } })).not.toContain(
      '• Notas:',
    )
    expect(
      orderMessage({ ...base, customer: { ...base.customer, notes: 'Tocar timbre' } }),
    ).toContain('• Notas: Tocar timbre')
  })

  it('cierra con la pregunta de confirmación', () => {
    expect(orderMessage(base)).toContain('✅ ¿Me confirman el pedido y los datos para concretar el pago?')
  })
})

describe('whatsappUrl', () => {
  it('apunta al número de la casa y codifica el mensaje entero', () => {
    const url = whatsappUrl('Hola ¿qué tal? 👋')
    expect(url.startsWith(`https://wa.me/${CONTACT.whatsapp}?text=`)).toBe(true)
    expect(url).not.toContain(' ')
    expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toBe('Hola ¿qué tal? 👋')
  })

  it('usa el número de producción', () => {
    expect(CONTACT.whatsapp).toBe('595994222542')
  })
})

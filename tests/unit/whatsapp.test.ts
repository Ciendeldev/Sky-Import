import { describe, expect, it } from 'vitest'
import { orderMessage, productMessage, productUrl, pyg, waPhone, whatsappUrl } from '@/lib/whatsapp'
import { CONTACT, SITE } from '@/config/site'

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
    expect(message).toContain('¡Hola! Me interesa este producto de *Sky Import*')
    expect(message).toContain('*PRODUCTO*')
    expect(message).toContain('*GeForce RTX 5080 16 GB*')
    expect(message).toContain('· Código: SI-VGA-0112')
    expect(message).toContain('· Cantidad: 1 u.')
    expect(message).toContain('· Precio: Gs. 9.243.000')
    expect(message).toContain('*TOTAL: Gs. 9.243.000*')
    expect(message).toContain('¿Me confirman si tienen disponible para coordinar la entrega?')
  })

  it('multiplica el total por la cantidad, dejando el unitario intacto', () => {
    const message = productMessage({ ...base, qty: 2 })
    expect(message).toContain('· Cantidad: 2 u.')
    expect(message).toContain('· Precio: Gs. 9.243.000')
    expect(message).toContain('*TOTAL: Gs. 18.485.000*')
  })

  it('pega el enlace real de la ficha, no un marcador', () => {
    const message = productMessage(base)
    expect(message).toContain(`· Link: ${SITE.origin}/es/producto/geforce-rtx-5080-16gb`)
    expect(message).not.toContain('concepto.de')
  })

  it('respeta el idioma en el enlace', () => {
    expect(productMessage({ ...base, locale: 'pt' })).toContain('/pt/producto/')
  })

  it('añade la variante al título solo cuando existe', () => {
    expect(productMessage(base)).not.toContain('(Var:')
    expect(productMessage({ ...base, variantLabel: '2 TB' })).toContain(
      '*GeForce RTX 5080 16 GB (Var: 2 TB)*',
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

  it('numera las líneas con números planos, no con teclas de emoji', () => {
    const message = orderMessage(base)
    expect(message).toContain('1. *GeForce RTX 5080 16 GB*')
    expect(message).toContain('2. *Ryzen 7 9800X3D*')
    expect(message).toContain('· Código: SI-CPU-0203')
    expect(message).toContain('· Cantidad: 2 u.  —  Gs. 7.104.000')
  })

  /**
   * El envío nunca lleva importe. Depende del peso y del destino, y la tienda
   * no puede saberlo antes de ver el pedido: se cierra en esta conversación.
   */
  it('el envío se coordina y no lleva ninguna cifra', () => {
    const message = orderMessage(base)
    expect(message).toContain('Envío a Gran Asunción: lo coordinamos por acá')
    expect(message).not.toContain('Gratis')
  })

  it('el total se rotula por lo que es: las piezas', () => {
    expect(orderMessage(base)).toContain('*TOTAL DE LAS PIEZAS: Gs. 16.347.000*')
  })

  it('oculta la línea del cupón si no descontó nada', () => {
    expect(orderMessage(base)).not.toContain('Cupón (')
    expect(orderMessage({ ...base, couponCode: 'SKY10', discountUsd: 0 })).not.toContain('Cupón (')
  })

  it('imprime el cupón en mayúsculas cuando sí descontó', () => {
    const message = orderMessage({
      ...base,
      couponCode: 'sky10',
      discountUsd: 220.9,
      totalUsd: 1988.1,
    })
    expect(message).toContain('Cupón (SKY10): −Gs. 1.635.000')
  })

  it('junta dirección y ciudad en una sola línea', () => {
    expect(orderMessage(base)).toContain('· Ciudad / Dirección: Av. España 1234, Asunción')
  })

  it('cae a la zona cuando no hay dirección — retiro en el local', () => {
    const message = orderMessage({
      ...base,
      zoneName: 'Retiro en el local',
      customer: { firstName: 'Ana', lastName: 'Giménez', phone: '+595 981 111 222' },
    })
    expect(message).toContain('· Ciudad / Dirección: Retiro en el local')
  })

  it('omite las notas si el cliente no escribió ninguna', () => {
    expect(orderMessage(base)).not.toContain('• Notas:')
    expect(orderMessage({ ...base, customer: { ...base.customer, notes: '  ' } })).not.toContain(
      '• Notas:',
    )
    expect(
      orderMessage({ ...base, customer: { ...base.customer, notes: 'Tocar timbre' } }),
    ).toContain('· Notas: Tocar timbre')
  })

  it('cierra con la pregunta de confirmación', () => {
    expect(orderMessage(base)).toContain('¿Me confirman el pedido y coordinamos la entrega?')
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

describe('waPhone', () => {
  it('cambia el cero de tránsito por el código de país', () => {
    // Como lo escribe el cliente en el checkout: 0994 222 542.
    expect(waPhone('0994 222 542')).toBe('595994222542')
    expect(waPhone('0981-123-456')).toBe('595981123456')
  })

  it('respeta un número que ya trae código de país', () => {
    expect(waPhone('+595 994 222 542')).toBe('595994222542')
    // Cliente brasileño: 55 no se toca.
    expect(waPhone('+55 45 99999 8888')).toBe('5545999998888')
  })

  it('completa un nacional escrito sin el cero', () => {
    expect(waPhone('994222542')).toBe('595994222542')
  })
})

describe('productUrl', () => {
  /**
   * El enlace de la ficha viaja dentro de cada mensaje de WhatsApp. Si el
   * origen apunta a otro sitio nadie se entera al compilar: el cliente
   * simplemente aterriza en la página de otra empresa. Esta prueba fija la
   * forma del origen para que un error así no pase inadvertido.
   */
  it('cuelga de un origen https absoluto y sin barra final', () => {
    expect(SITE.origin).toMatch(/^https:\/\/[^/]+$/)
  })

  it('arma la dirección pública de la ficha', () => {
    expect(productUrl('geforce-rtx-5080-16gb')).toBe(
      `${SITE.origin}/es/producto/geforce-rtx-5080-16gb`,
    )
    expect(productUrl('geforce-rtx-5080-16gb', 'pt')).toBe(
      `${SITE.origin}/pt/producto/geforce-rtx-5080-16gb`,
    )
  })
})

describe('caracteres que sobreviven al viaje', () => {
  /**
   * Los mensajes llegaban a WhatsApp con un rombo con interrogación donde iba
   * cada emoji. El código fuente estaba limpio y el paquete compilado también
   * —se comprobaron los dos, byte a byte—, así que lo que se rompe está en el
   * traspaso del enlace del navegador a la aplicación: fuera de este proyecto
   * y fuera de su alcance.
   *
   * La captura del cliente dejó la única pista útil: el filete y el punto
   * medio llegaron PERFECTOS, y todos los emojis llegaron rotos. Los dos
   * primeros viven en el plano básico —tres bytes o menos en UTF-8—; los
   * emojis, fuera de él.
   *
   * Estas pruebas fijan esa frontera. No adivinan qué cliente usa cada
   * comprador: prohíben todo lo que no demostró sobrevivir el viaje, y exigen
   * que la estructura la lleven las etiquetas y no los dibujos.
   */
  const mensajes = [
    productMessage({
      name: 'GeForce RTX 5080 16 GB',
      sku: 'SI-VGA-0112',
      slug: 'geforce-rtx-5080-16gb',
      qty: 1,
      unitPriceUsd: 1249,
    }),
    orderMessage({
      lines: [{ name: 'Pieza', sku: 'SI-VGA-0112', qty: 1, subtotalUsd: 1249 }],
      subtotalUsd: 1249,
      zoneName: 'Encarnación',
      totalUsd: 1249,
      orderNumber: 'SI-1042',
      customer: {
        firstName: 'Cielo',
        lastName: 'Medina',
        phone: '0994222542',
        address: 'Barrio Remansito',
        notes: 'Casa amarilla',
      },
    }),
  ]

  it('no contiene ningún carácter fuera del plano básico', () => {
    for (const mensaje of mensajes) {
      // Un par suplente es la mitad de un carácter astral: si aparece uno,
      // hay algo fuera del plano básico.
      expect(mensaje).not.toMatch(/[\uD800-\uDFFF]/)
    }
  })

  it('no usa selectores de variación ni teclas de emoji', () => {
    for (const mensaje of mensajes) {
      expect(mensaje).not.toMatch(/️/)
      expect(mensaje).not.toMatch(/⃣/)
    }
  })

  it('la estructura la llevan las etiquetas, no los dibujos', () => {
    const [ficha, pedido] = mensajes as [string, string]

    expect(ficha).toContain('*PRODUCTO*')
    expect(ficha).toContain('· Código: SI-VGA-0112')
    expect(ficha).toContain('· Cantidad: 1 u.')
    expect(ficha).toContain('· Precio: Gs.')

    expect(pedido).toContain('Pedido SI-1042')
    expect(pedido).toContain('*MI PEDIDO*')
    expect(pedido).toContain('*DATOS DE ENTREGA*')
    expect(pedido).toContain('· Nombre: Cielo Medina')
    expect(pedido).toContain('· Teléfono: 0994222542')
    expect(pedido).toContain('· Ciudad / Dirección: Barrio Remansito')
    expect(pedido).toContain('· Notas: Casa amarilla')
    expect(pedido).toContain('Envío a Encarnación: lo coordinamos por acá')
    expect(pedido).toContain('*TOTAL DE LAS PIEZAS: Gs.')
  })

  it('ningún mensaje promete envío gratis ni bonificado', () => {
    for (const mensaje of mensajes) {
      expect(mensaje.toLowerCase()).not.toContain('gratis')
      expect(mensaje.toLowerCase()).not.toContain('bonificado')
    }
  })
})

describe('waPhone', () => {
  it('cambia el cero de tránsito por el código de país', () => {
    expect(waPhone('0994 222 542')).toBe('595994222542')
    expect(waPhone('0981-123-456')).toBe('595981123456')
  })

  it('respeta un número que ya trae código de país', () => {
    expect(waPhone('+595 994 222 542')).toBe('595994222542')
    expect(waPhone('+55 45 99999 8888')).toBe('5545999998888')
  })

  it('completa un nacional escrito sin el cero', () => {
    expect(waPhone('994222542')).toBe('595994222542')
  })
})

describe('productUrl', () => {
  /**
   * El enlace de la ficha viaja dentro de cada mensaje. Si el origen apunta a
   * otro sitio nadie se entera al compilar: el cliente aterriza en la página
   * de otra empresa. Esta prueba fija la forma del origen.
   */
  it('cuelga de un origen https absoluto y sin barra final', () => {
    expect(SITE.origin).toMatch(/^https:\/\/[^/]+$/)
  })

  it('arma la dirección pública de la ficha', () => {
    expect(productUrl('geforce-rtx-5080-16gb')).toBe(
      `${SITE.origin}/es/producto/geforce-rtx-5080-16gb`,
    )
    expect(productUrl('geforce-rtx-5080-16gb', 'pt')).toBe(
      `${SITE.origin}/pt/producto/geforce-rtx-5080-16gb`,
    )
  })
})

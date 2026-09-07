import { expect, test } from '@playwright/test'

/**
 * Recorrido completo de compra, de punta a punta, como lo haría un cliente.
 *
 * La tienda cierra la venta por WhatsApp. Lo que estas pruebas fijan es que el
 * recorrido llegue entero hasta ese punto, que el mensaje que se genera lleve
 * el pedido completo y el número correcto, y que en ninguna pantalla se pida un
 * dato de tarjeta.
 */

const WHATSAPP = '595994222542'

test('el recorrido completo termina en un mensaje de WhatsApp con el pedido armado', async ({
  page,
  context,
}) => {
  // Cualquier excepción no capturada durante el recorrido se convierte en un
  // fallo con su mensaje. Sin esto, un error de cliente se ve como «el botón no
  // apareció» y hay que adivinar la causa.
  const fallos: string[] = []
  page.on('pageerror', (error) => fallos.push(error.message))

  // 1 · abrir el catálogo
  await page.goto('/es/catalogo')
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeVisible()

  // 2 · buscar — sin tildes, que es como escribe casi todo el mundo
  await page.getByLabel('Buscar en el catálogo').fill('rtx 5070')
  await expect(page.getByRole('article').first()).toBeVisible()

  // 3 · abrir una pieza
  await page.getByRole('link', { name: 'GeForce RTX 5070 12 GB', exact: false }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('RTX 5070')
  await expect(page.getByText('SI-VGA-0124')).toBeVisible()

  // 4 · la acción principal de la ficha es comprar por WhatsApp
  const comprar = page.getByTestId('comprar-whatsapp')
  await expect(comprar).toBeVisible()
  const enlaceDirecto = await comprar.getAttribute('href')
  expect(enlaceDirecto).toContain(`https://wa.me/${WHATSAPP}`)

  const mensajeDirecto = decodeURIComponent(new URL(enlaceDirecto!).searchParams.get('text') ?? '')
  expect(mensajeDirecto).toContain('*PRODUCTO*')
  expect(mensajeDirecto).toContain('SI-VGA-0124')
  expect(mensajeDirecto).toContain('/es/producto/geforce-rtx-5070-12gb')
  expect(mensajeDirecto).toContain('*TOTAL: Gs.')

  // 5 · agregar al carrito con la acción secundaria
  await page.getByTestId('agregar').click()
  await expect(page.getByTestId('agregar')).toContainText('Agregado')
  await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('01')

  // 6 · modificar la cantidad desde el carrito
  await page.getByRole('button', { name: 'Abrir carrito' }).click()
  const panel = page.getByRole('dialog', { name: 'Carrito' })
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Sumar una unidad' }).first().click()
  await expect(panel.getByTestId('cantidad').first()).toHaveText('2')
  await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('02')

  // 7 · checkout
  await panel.getByRole('link', { name: 'Finalizar compra' }).click()
  await expect(page).toHaveURL(/\/es\/checkout$/)

  expect(fallos, 'ninguna excepción de cliente hasta el checkout').toEqual([])
  await expect(page.getByRole('heading', { level: 2, name: 'Tus datos' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Entrega' })).toBeVisible()

  // No hay selector de pasarelas ni campo de tarjeta en ninguna parte.
  await expect(page.locator('input[autocomplete*="cc-"]')).toHaveCount(0)
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  await expect(page.getByText('Transferencia bancaria')).toHaveCount(0)
  await expect(page.getByText('Tarjeta en el local')).toHaveCount(0)

  // 8 · faltan datos: el pedido no sale
  await page.getByTestId('enviar-pedido').click()
  await expect(page.getByTestId('error-checkout')).toContainText(
    'Completá nombre, apellido y teléfono',
  )

  // 9 · completar los datos de entrega
  await page.getByLabel('Nombre', { exact: true }).fill('Ana')
  await page.getByLabel('Apellido').fill('Giménez')
  await page.getByLabel('Teléfono de contacto').fill('+595 981 111 222')

  // La lista de ciudades vive en la base y puede cambiar: la prueba toma la
  // segunda opción, sea cual sea, y verifica que esa misma llegue al mensaje.
  const zona = page.locator('#zona')
  const zonaElegida = (await zona.locator('option').nth(1).textContent())?.trim() ?? ''
  await zona.selectOption({ index: 1 })
  await page.getByLabel('Dirección exacta').fill('Av. España 1234')
  await page.getByLabel('Notas del pedido', { exact: false }).fill('Tocar timbre')

  // 10 · enviar abre WhatsApp con el pedido entero escrito.
  //
  // La petición a wa.me se corta antes de salir: la prueba comprueba QUÉ se
  // manda, no que WhatsApp esté en pie. Sin esto, el resultado dependería de la
  // red del que corre las pruebas.
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }),
  )

  /**
   * El registro del pedido se simula, y esto NO es un atajo.
   *
   * `place_order` descuenta stock e inserta filas de verdad. Sin interceptarlo,
   * cada corrida de esta prueba vaciaba el inventario real y llenaba la tabla
   * de pedidos con clientes inventados: a la cuarta pasada la pieza se quedaba
   * sin unidades y la prueba fallaba sola, informando de un bug que no existía.
   *
   * Una prueba de extremo a extremo no puede mutar los datos del negocio. Lo
   * que se verifica acá es el recorrido del cliente y el mensaje que sale; que
   * la función descuente bien el stock es asunto de la base y de su propia
   * prueba.
   */
  await context.route('**/rest/v1/rpc/place_order', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        order_number: 'SI-PRUEBA',
        subtotal_usd: 0,
        discount_usd: 0,
        shipping_usd: 0,
        total_usd: 0,
        total_pyg: 0,
        fx_pyg: 7400,
      }),
    }),
  )

  // En escritorio WhatsApp se abre en otra pestaña; en teléfono, en la misma,
  // porque ahí `wa.me` lanza la aplicación y una pestaña nueva quedaría vacía.
  const enTelefono = Boolean(test.info().project.use.isMobile)

  const pestañaPromesa = enTelefono ? null : context.waitForEvent('page')
  await page.getByTestId('enviar-pedido').click()

  let destino: string
  if (pestañaPromesa) {
    const pestaña = await pestañaPromesa
    // La pestaña nace en `about:blank` y navega un instante después.
    await pestaña.waitForURL(/wa\.me/, { timeout: 10_000 })
    destino = pestaña.url()
    await pestaña.close()
  } else {
    await page.waitForURL(/wa\.me/, { timeout: 10_000 })
    destino = page.url()
  }

  const url = new URL(destino)
  expect(url.hostname).toBe('wa.me')
  expect(url.pathname).toBe(`/${WHATSAPP}`)

  const mensaje = decodeURIComponent(url.searchParams.get('text') ?? '')
  expect(mensaje).toContain('*MI PEDIDO*')
  expect(mensaje).toContain('1. ')
  expect(mensaje).toContain('· Cantidad: 2 u.')
  expect(mensaje).toContain('*DATOS DE ENTREGA*')
  expect(mensaje).toContain('· Nombre: Ana Giménez')
  expect(mensaje).toContain('· Teléfono: +595 981 111 222')
  expect(mensaje).toContain('Av. España 1234')
  expect(mensaje).toContain('· Notas: Tocar timbre')
  expect(mensaje).toContain(`Envío a ${zonaElegida}: lo coordinamos por acá`)
  expect(mensaje).toContain('*TOTAL DE LAS PIEZAS: Gs.')
  // Sin cupón aplicado, esa línea no se imprime.
  expect(mensaje).not.toContain('Cupón (')

  // 11 · el carrito queda vacío después de enviar el pedido.
  //
  // En escritorio la tienda sigue en su pestaña; en teléfono se navegó a
  // WhatsApp, así que hay que volver para comprobarlo.
  if (enTelefono) await page.goBack()
  await expect(page.getByRole('button', { name: 'Abrir carrito' })).not.toContainText('02')
})

test('ninguna pantalla se declara una demostración', async ({ page }) => {
  const rutas = [
    '/es',
    '/es/catalogo',
    '/es/producto/geforce-rtx-5080-16gb',
    '/es/armar',
    '/es/guias',
    '/es/carrito',
    '/es/checkout',
  ]

  for (const ruta of rutas) {
    await page.goto(ruta)
    const texto = (await page.locator('body').innerText()).toLowerCase()
    for (const palabra of [
      'demostrativ',
      'prototipo',
      'ficticio',
      'portafolio',
      'portfólio',
      'modo desarrollo',
      'página de prueba',
    ]) {
      expect(texto, `«${palabra}» no debe aparecer en ${ruta}`).not.toContain(palabra)
    }
    expect((await page.title()).toLowerCase()).not.toContain('demo')
  }
})

test('el carrito sobrevive a una recarga completa', async ({ page }) => {
  await page.goto('/es/producto/corsair-rm750e')
  await page.getByTestId('agregar').click()
  await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('01')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('01')
})

test('la tienda se indexa y el panel no', async ({ page }) => {
  const response = await page.goto('/es')
  expect(response?.headers()['x-robots-tag'] ?? '').not.toContain('noindex')
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)

  const robots = await page.request.get('/robots.txt')
  const texto = await robots.text()
  expect(texto).toContain('Allow: /')
  expect(texto).toContain('/admin')

  // El panel sí queda fuera de los buscadores, por cabecera.
  const panel = await page.request.get('/admin/acceso')
  expect(panel.headers()['x-robots-tag']).toContain('noindex')
})

test('el panel exige sesión', async ({ page }) => {
  await page.goto('/admin')
  // Sin sesión, cualquier ruta del panel lleva a la pantalla de acceso.
  await expect(page).toHaveURL(/\/admin\/acceso$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Panel de administración')
})

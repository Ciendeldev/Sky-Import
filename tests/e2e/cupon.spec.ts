import { expect, test } from '@playwright/test'
import { CON_BASE } from '../../playwright.config'

/**
 * EL CUPÓN, DE PUNTA A PUNTA
 *
 * El descuento no se calcula en el navegador: se pide a `validate_coupon`, que
 * vive en la base y devuelve el importe ya resuelto. Eso deja dos cosas que
 * solo se pueden comprobar aquí —que el formulario sepa pedirlo y que el
 * resultado llegue al total— y son justo las que ninguna prueba cubría.
 *
 * La respuesta de la base se simula. Igual que en `compra.spec.ts`, una prueba
 * no puede depender de que exista un cupón concreto en la tienda real ni gastar
 * uno de sus usos.
 *
 * **Dos modos, dos comportamientos.** Sin claves de Supabase —como en la
 * integración continua— la tienda no consulta cupones: lo dice y sigue
 * vendiendo. Eso también es correcto y también se comprueba, en el último caso
 * de este archivo. Las tres primeras necesitan base y se saltan sin ella, en
 * lugar de fallar informando de un problema que no existe.
 */

const CUPON = 'PRUEBA10'

async function prepararCarrito(page: import('@playwright/test').Page) {
  await page.goto('/es/producto/geforce-rtx-5070-12gb')
  await page.getByTestId('agregar').click()
  await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('01')
  await page.goto('/es/checkout')
  await expect(page.getByRole('heading', { level: 2, name: 'Tus datos' })).toBeVisible()
}

test('un cupón válido descuenta del total', async ({ page, context }) => {
  test.skip(!CON_BASE, 'Sin claves de Supabase la tienda no consulta cupones: ver el último caso.')

  await context.route('**/rest/v1/rpc/validate_coupon', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        code: CUPON,
        kind: 'percent',
        value: 10,
        discount_usd: 61.9,
      }),
    }),
  )

  await prepararCarrito(page)

  const resumen = page.locator('aside')
  await expect(resumen).toContainText('US$ 619')

  await page.getByLabel('Código del cupón').fill(CUPON)
  await page.getByRole('button', { name: 'Aplicar' }).click()

  // El código pasa a mostrarse como aplicado, y el descuento entra en el
  // resumen. Se comprueban los dos sitios por separado: el aviso del apartado
  // del cupón y la línea del resumen dicen lo mismo a propósito, y una prueba
  // que buscara el texto suelto no sabría cuál de los dos está mirando.
  const apartadoCupon = page.getByRole('region', { name: 'Cupón de descuento' })
  await expect(apartadoCupon).toContainText('Cupón aplicado')
  await expect(apartadoCupon).toContainText(CUPON)

  await expect(resumen).toContainText(CUPON)
  await expect(resumen).toContainText('US$ 557')

  // Y viaja al mensaje de WhatsApp con su línea propia.
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }),
  )
  await context.route('**/rest/v1/rpc/place_order', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, order_number: 'SI-PRUEBA', fx_pyg: 7400 }),
    }),
  )

  await page.getByLabel('Nombre', { exact: true }).fill('Ana')
  await page.getByLabel('Apellido').fill('Giménez')
  await page.getByLabel('Teléfono de contacto').fill('+595 981 111 222')

  const enTelefono = Boolean(test.info().project.use.isMobile)
  const nueva = enTelefono ? null : context.waitForEvent('page')
  await page.getByTestId('enviar-pedido').click()

  let destino: string
  if (nueva) {
    const pestaña = await nueva
    await pestaña.waitForURL(/wa\.me/, { timeout: 10_000 })
    destino = pestaña.url()
    await pestaña.close()
  } else {
    await page.waitForURL(/wa\.me/, { timeout: 10_000 })
    destino = page.url()
  }

  const mensaje = decodeURIComponent(new URL(destino).searchParams.get('text') ?? '')
  expect(mensaje).toContain(`Cupón (${CUPON})`)
})

test('un cupón inexistente lo dice y no toca el total', async ({ page, context }) => {
  test.skip(!CON_BASE, 'Sin claves de Supabase la tienda no consulta cupones: ver el último caso.')

  await context.route('**/rest/v1/rpc/validate_coupon', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, reason: 'not_found' }),
    }),
  )

  await prepararCarrito(page)

  await page.getByLabel('Código del cupón').fill('NOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()

  await expect(page.getByTestId('error-cupon')).toContainText('Ese código no existe')
  await expect(page.locator('aside')).toContainText('US$ 619')
  await expect(page.getByRole('region', { name: 'Cupón de descuento' })).not.toContainText(
    'Cupón aplicado',
  )
})

test('un cupón por debajo del mínimo explica el motivo', async ({ page, context }) => {
  test.skip(!CON_BASE, 'Sin claves de Supabase la tienda no consulta cupones: ver el último caso.')

  await context.route('**/rest/v1/rpc/validate_coupon', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, reason: 'below_minimum', min_purchase_usd: 1000 }),
    }),
  )

  await prepararCarrito(page)

  await page.getByLabel('Código del cupón').fill(CUPON)
  await page.getByRole('button', { name: 'Aplicar' }).click()

  await expect(page.getByTestId('error-cupon')).toContainText('no llega al mínimo')
})

test('el botón de aplicar no hace nada con el campo vacío', async ({ page }) => {
  await prepararCarrito(page)
  // Sin texto, el botón está deshabilitado: no se puede consultar la nada.
  await expect(page.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
})

test('sin base configurada lo dice, y la venta sigue igual', async ({ page }) => {
  test.skip(CON_BASE, 'Este caso describe la tienda SIN Supabase; acá sí lo tiene.')

  /**
   * Es el modo en que arranca cualquier despliegue nuevo, y el que corre en la
   * integración continua. Lo que importa no es que el cupón funcione —no puede—
   * sino que la tienda lo diga con claridad y **no bloquee la compra por eso**.
   */
  await prepararCarrito(page)

  await page.getByLabel('Código del cupón').fill(CUPON)
  await page.getByRole('button', { name: 'Aplicar' }).click()

  await expect(page.getByTestId('error-cupon')).toContainText('No pudimos comprobar el cupón')

  // El total no se toca y el botón de enviar sigue disponible: sin cupón se
  // vende igual.
  await expect(page.locator('aside')).toContainText('US$ 619')
  await expect(page.getByTestId('enviar-pedido')).toBeEnabled()
})

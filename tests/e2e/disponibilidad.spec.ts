import { expect, test } from '@playwright/test'
import { CON_BASE } from '../../playwright.config'

for (const message of [
  'Sin stock suficiente de GPU: quedan 0',
  'Seleccioná una variante de GPU',
  'Variante no disponible: RETIRADA',
]) {
  test(`un rechazo comercial conserva el carrito: ${message}`, async ({ page, context }) => {
    test.skip(!CON_BASE, 'La tienda sin base no invoca el registro de pedidos.')
    let whatsappRequests = 0
    await context.route('https://api.whatsapp.com/**', (route) => {
      whatsappRequests++
      return route.fulfill({ body: 'No debería abrirse' })
    })
    await context.route('**/rest/v1/rpc/place_order', (route) => route.fulfill({
      status: 400, contentType: 'application/json',
      body: JSON.stringify({ code: '23514', message, details: null, hint: null }),
    }))
    await page.goto('/es/producto/geforce-rtx-5070-12gb')
    await page.getByTestId('agregar').click()
    await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('01')
    await page.goto('/es/checkout')
    await page.getByLabel('Nombre', { exact: true }).fill('Prueba')
    await page.getByLabel('Apellido', { exact: true }).fill('Local')
    await page.getByLabel('Teléfono de contacto').fill('000000')
    await page.locator('#zona').selectOption('retiro-local')
    await page.getByTestId('enviar-pedido').click()
    await expect(page.getByTestId('error-checkout')).toHaveText(message)
    await expect(page).toHaveURL(/\/es\/checkout$/)
    await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('01')
    await expect.poll(() => context.pages().length).toBe(1)
    expect(whatsappRequests).toBe(0)
  })
}

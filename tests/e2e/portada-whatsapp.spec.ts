import { expect, test, type Page } from '@playwright/test'

async function scrollToProgress(page: Page, value: number) {
  await page.getByTestId('gpu-scroll').evaluate((track, progress) => {
    const stage = track.querySelector('.gpu-scroll__stage') as HTMLElement
    const top = parseFloat(getComputedStyle(stage).top)
    window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().top - top + (track.clientHeight - stage.offsetHeight) * progress, behavior: 'instant' })
  }, value)
}
test('la gráfica se desarma, se monta y revierte al subir', async ({ page }, info) => {
  // Presupuesto propio: esta prueba arranca WebGL, recorre cinco posiciones de
  // desplazamiento con amortiguación y saca dos capturas del lienzo. Medido,
  // tarda ~60 s, que es exactamente el límite global: quedaba en el filo y
  // fallaba de forma intermitente por agotar el tiempo, no por un defecto.
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/es')
  await expect(page.locator('.intro')).toHaveCount(0)
  await scrollToProgress(page, 0)
  const gpu = page.getByTestId('gpu-assembly')
  await expect(gpu.locator('canvas')).toBeVisible({ timeout: 20000 })
  await expect(gpu).toHaveAttribute('data-model', 'rtx-5090-founders-edition')
  await expect(gpu).toHaveAttribute('data-part-count', '9')
  await expect.poll(async () => Number(await gpu.getAttribute('data-assembly-open'))).toBeLessThan(0.02)
  await scrollToProgress(page, 0.5)
  await expect.poll(async () => Number(await gpu.getAttribute('data-assembly-open'))).toBeGreaterThan(0.98)
  const stage = page.locator('.gpu-scroll__stage')
  const mid = await stage.boundingBox()
  expect(mid!.y).toBeGreaterThan(60)
  expect(mid!.y).toBeLessThan(110)
  await stage.screenshot({ path: info.outputPath('gpu-desarmada.png') })
  await scrollToProgress(page, 1)
  await expect.poll(async () => Number(await gpu.getAttribute('data-assembly-open'))).toBeLessThan(0.02)
  await stage.screenshot({ path: info.outputPath('gpu-montada.png') })
  await scrollToProgress(page, 0.5)
  await expect.poll(async () => Number(await gpu.getAttribute('data-assembly-open'))).toBeGreaterThan(0.98)
  await scrollToProgress(page, 0)
  await expect.poll(async () => Number(await gpu.getAttribute('data-assembly-open'))).toBeLessThan(0.02)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
test('movimiento reducido muestra la foto sin canvas ni recorrido vacío', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/es')
  const track = page.getByTestId('gpu-scroll')
  await track.scrollIntoViewIfNeeded()
  await expect(track).toHaveAttribute('data-static', 'true')
  await expect(track.locator('canvas')).toHaveCount(0)
  await expect(track.locator('img')).toBeVisible()
  await expect.poll(() => track.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await track.evaluate((el) => el.clientHeight === el.firstElementChild?.clientHeight || Math.abs(el.clientHeight - (el.firstElementChild as HTMLElement).offsetHeight) < 2)).toBe(true)
})
test('la pérdida de WebGL recupera la fotografía', async ({ page }) => {
  await page.goto('/es')
  await scrollToProgress(page, 0.5)
  const track = page.getByTestId('gpu-scroll')
  const canvas = track.locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 20000 })
  await canvas.evaluate((el) => el.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
  await expect(track).toHaveAttribute('data-static', 'true')
  await expect(canvas).toHaveCount(0)
  await expect(track.locator('img').locator('..')).toHaveCSS('opacity', '1')
})
test('el saludo flotante lleva identidad, emojis e idioma', async ({ page }) => {
  for (const locale of ['es', 'pt']) {
    await page.goto('/' + locale)
    const fab = page.locator('a.u-wa-fab')
    await expect(fab).toBeVisible()
    const message = new URL((await fab.getAttribute('href'))!).searchParams.get('text')!
    expect(message).toContain('Sky Import')
    expect(message).toContain('👋')
    expect(message).toContain('💻')
    expect(message).toContain(locale === 'es' ? '¿Me ayudan' : 'Podem me ajudar')
    expect(message).not.toContain('\uFFFD')
  }
})

test('la RTX 5090 permite identificar piezas con teclado sin mover el scroll', async ({ page }) => {
  await page.goto('/es')
  await expect(page.locator('.intro')).toHaveCount(0)
  await scrollToProgress(page, 0.5)
  const selector = page.getByRole('combobox', { name: 'Identificar una pieza de la RTX 5090' })
  await expect(selector).toBeVisible({ timeout: 20000 })
  const before = await page.evaluate(() => scrollY)
  await selector.focus()
  await selector.press('Home')
  await selector.press('ArrowDown')
  await selector.press('Enter')
  await expect(selector).toHaveValue('frame')
  await selector.selectOption('pcb')
  await expect(selector).toHaveValue('pcb')
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(3)
  await selector.selectOption('')
  await expect(selector).toHaveValue('')
})
test('la consulta de RTX 5090 no hereda SKU ni precio de la RTX 5080', async ({ page }) => {
  for (const locale of ['es', 'pt']) {
    await page.goto('/' + locale)
    const section = page.locator('section[aria-labelledby="destacada"]')
    await expect(section.locator('h2')).toContainText('RTX 5090')
    await expect(section).toContainText('32 GB GDDR7')
    const cta = section.getByRole('link', { name: locale === 'es' ? 'Consultar por la RTX 5090' : 'Consultar sobre a RTX 5090' })
    const message = new URL((await cta.getAttribute('href'))!).searchParams.get('text')!
    expect(message).toContain('RTX 5090')
    expect(message).toContain('👋')
    expect(message).not.toContain('5080')
    expect(message).not.toContain('1.249')
    expect(message).toContain(locale === 'es' ? 'disponibilidad' : 'disponibilidade')
  }
})

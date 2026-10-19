import { expect, test } from '@playwright/test'
import { SITE } from '../../src/config/site'

test('las fichas y sus traducciones identifican su propia URL', async ({ page }) => {
  for (const path of ['/es/catalogo', '/pt/producto/geforce-rtx-5080-16gb', '/es/guias/el-zocalo-decide']) {
    await page.goto(path)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE.origin + path)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', SITE.origin + path)
    await expect(page.locator('link[hreflang="es"]')).toHaveAttribute('href', SITE.origin + path.replace(/^\/pt/, '/es'))
    await expect(page.locator('link[hreflang="pt-BR"]')).toHaveAttribute('href', SITE.origin + path.replace(/^\/es/, '/pt'))
  }
})

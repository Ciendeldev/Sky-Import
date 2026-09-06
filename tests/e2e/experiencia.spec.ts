import { expect, test, type Page } from '@playwright/test'

type BuildSlot = 'cpu' | 'motherboard' | 'ram' | 'gpu' | 'storage' | 'psu' | 'cooling' | 'case'

/**
 * Comprobaciones de la experiencia: intro, cursor, movimiento reducido, teclado,
 * moneda, idioma, configurador y estados vacíos. Son las promesas que un
 * recorrido de compra no toca.
 */

/** En teléfono los selectores de moneda e idioma viven dentro del menú. */
async function abrirControles(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
}

test.describe('intro de marca', () => {
  test('aparece en una carga completa y desaparece dentro del tope', async ({ page }) => {
    await page.goto('/es')
    // Está en el marcado del servidor: no depende de la hidratación.
    await expect(page.locator('.intro')).toBeAttached()
    // La cortina arranca a 1,36 s y la última lama sale a ~2,3 s. El tope de
    // aquí es holgado a propósito: mide que se va sola, no el reloj exacto.
    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 5000 })
  })

  test('deja de capturar el puntero en cuanto la cortina se abre', async ({ page }) => {
    await page.goto('/es')
    // Lo que de verdad importa no es cuándo desaparece el nodo, sino desde
    // cuándo la tienda es usable. En el instante en que la primera lama se
    // mueve, el panel suelta el puntero aunque siga desmontándose.
    await page.waitForTimeout(2500)
    const libre = await page.evaluate(() => {
      const nodo = document.querySelector('.intro')
      return !nodo || getComputedStyle(nodo).pointerEvents === 'none'
    })
    expect(libre).toBe(true)
  })

  test('no vuelve a aparecer al navegar entre páginas', async ({ page, isMobile }) => {
    await page.goto('/es')
    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 4000 })

    if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('banner').getByRole('link', { name: 'Catálogo' }).first().click()
    await expect(page).toHaveURL(/\/es\/catalogo$/)
    await expect(page.locator('.intro')).toHaveCount(0)
  })

  test('se puede omitir con Escape', async ({ page }) => {
    await page.goto('/es')
    await page.keyboard.press('Escape')
    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 2000 })
  })
})

test.describe('movimiento reducido', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('la intro no se pinta y el titular está visible desde el primer cuadro', async ({ page }) => {
    await page.goto('/es')
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'skip')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.intro')).toHaveCount(0)
  })

  test('las entradas por scroll no dejan contenido invisible', async ({ page }) => {
    await page.goto('/es')
    await page.getByRole('heading', { name: 'Qué decide cada pieza' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: 'Qué decide cada pieza' })).toBeVisible()
  })
})

test.describe('cursor propio', () => {
  test('se dibuja con puntero fino y no existe en táctil', async ({ page, isMobile }) => {
    await page.goto('/es')
    await page.mouse.move(400, 400)

    if (isMobile) {
      await expect(page.locator('html')).not.toHaveAttribute('data-pointer', 'hidden')
      await expect(page.locator('.cur-dot')).toHaveCount(0)
    } else {
      await expect(page.locator('html')).toHaveAttribute('data-pointer', 'hidden')
      await expect(page.locator('.cur-dot')).toBeAttached()
    }
  })

  test('el retículo nunca se traga la pantalla', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hay cursor propio en táctil')
    await page.goto('/es')

    // Sobre una ficha de producto —el elemento grande donde antes el retículo
    // adoptaba el rectángulo del objetivo y ocupaba media ventana.
    const ficha = page.locator('[data-cursor="product"]').first()
    await ficha.scrollIntoViewIfNeeded()
    await ficha.hover()

    const caja = await page.locator('.cur-ring').boundingBox()
    expect(caja).not.toBeNull()
    expect(caja!.width).toBeLessThan(120)
    expect(caja!.height).toBeLessThan(120)
  })
})

test.describe('teclado', () => {
  test('el enlace de salto es el primer destino del tabulador', async ({ page }) => {
    await page.goto('/es')
    await expect(page.locator('.intro')).toHaveCount(0, { timeout: 4000 })

    await page.keyboard.press('Tab')
    const enfocado = page.locator('.skip-link')
    await expect(enfocado).toBeFocused()
    await expect(enfocado).toBeVisible()
  })

  test('el carrito atrapa el foco, cierra con Escape y lo devuelve a quien lo abrió', async ({
    page,
  }) => {
    await page.goto('/es/producto/thermal-grizzly-kryonaut-1g')
    await page.getByTestId('agregar').click()

    const abridor = page.getByRole('button', { name: 'Abrir carrito' })
    await abridor.click()

    const panel = page.getByRole('dialog', { name: 'Carrito' })
    await expect(panel).toBeVisible()
    await expect(panel.locator(':focus')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(panel).not.toBeVisible()
    await expect(abridor).toBeFocused()
  })
})

test.describe('moneda e idioma', () => {
  test('cambiar de moneda cambia el importe sin recargar la página', async ({ page, isMobile }) => {
    await page.goto('/es/producto/geforce-rtx-5080-16gb')
    await expect(page.getByText('US$ 1.249').first()).toBeVisible()

    await abrirControles(page, isMobile)
    await page.getByRole('group', { name: 'Moneda' }).getByRole('button', { name: 'BRL' }).click()

    await expect(page.locator('html')).toHaveAttribute('data-currency', 'BRL')
    await expect(page.getByText('R$ 6.744,60').first()).toBeVisible()
    // El importe en dólares sigue impreso en el HTML —así no hay parpadeo—
    // pero deja de estar visible y sale del árbol de accesibilidad.
    await expect(page.getByText('US$ 1.249').first()).not.toBeVisible()
  })

  test('cambiar de idioma NO recarga la página: traduce en el sitio', async ({ page, isMobile }) => {
    await page.goto('/es/catalogo')
    await expect(page.getByRole('article').first()).toBeVisible()

    // Se marca la ventana para detectar cualquier recarga o navegación real.
    await page.evaluate(() => {
      ;(window as unknown as { __vivo: boolean }).__vivo = true
    })

    await abrirControles(page, isMobile)
    await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'PT' }).click()

    await expect(page.getByPlaceholder('Buscar por modelo, marca ou código')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page).toHaveURL(/\/pt\/catalogo$/)

    // La marca sigue ahí: no hubo recarga, solo cambió el idioma.
    const vivo = await page.evaluate(() => (window as unknown as { __vivo?: boolean }).__vivo === true)
    expect(vivo, 'la página no debe recargarse al cambiar de idioma').toBe(true)
  })

  test('el idioma sobrevive a una recarga porque queda en la ruta', async ({ page, isMobile }) => {
    await page.goto('/es')
    await abrirControles(page, isMobile)
    await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'PT' }).click()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  })

  test('quien entra sin prefijo de idioma cae en español', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/es$/)
  })
})

test.describe('configurador', () => {
  const elegir = async (page: Page, ranura: BuildSlot, pieza: RegExp) => {
    await page
      .locator(`li[data-slot="${ranura}"]`)
      .getByRole('button', { name: /Elegir|Cambiar/ })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: pieza }).click()
  }

  test('detecta un zócalo incompatible y lo explica en lenguaje llano', async ({ page }) => {
    await page.goto('/es/armar')
    await elegir(page, 'cpu', /Ryzen 7 9800X3D/)
    await elegir(page, 'motherboard', /B760M DS3H/)

    await expect(page.getByText('El procesador no entra en esta placa')).toBeVisible()
    await expect(page.getByText(/zócalo AM5 y la placa es LGA1700/)).toBeVisible()
    await expect(page.getByText('Hay piezas que no encajan')).toBeVisible()
  })

  test('avisa cuando la fuente queda corta para la placa de video', async ({ page }) => {
    await page.goto('/es/armar')
    await elegir(page, 'gpu', /GeForce RTX 5080/)
    await elegir(page, 'psu', /MAG A650BN/)

    await expect(page.getByText('La fuente está por debajo de lo recomendado')).toBeVisible()
    await expect(page.getByText('Hay algo que conviene revisar')).toBeVisible()
  })

  /**
   * Las ocho ranuras de un equipo entero. La prueba de encendido solo existe
   * con el armado completo, así que no hay atajo: hay que elegirlas todas.
   */
  const armadoCompleto = async (page: Page, psu: RegExp) => {
    await elegir(page, 'cpu', /Ryzen 7 9800X3D/)
    await elegir(page, 'motherboard', /MAG B850 TOMAHAWK/)
    await elegir(page, 'ram', /Vengeance DDR5 32 GB/)
    await elegir(page, 'gpu', /GeForce RTX 5080/)
    await elegir(page, 'storage', /990 PRO 2 TB/)
    await elegir(page, 'psu', psu)
    await elegir(page, 'cooling', /NH-D15/)
    await elegir(page, 'case', /LANCOOL 216/)
  }

  test('la prueba de encendido arranca un armado sano', async ({ page }) => {
    await page.goto('/es/armar')
    await armadoCompleto(page, /RM1000x/)

    await page.getByRole('button', { name: 'Encender PC' }).click()
    await expect(page.getByText('Sistema encendido').first()).toBeVisible()
    // Encendida, la única salida es apagarla: el botón cambia de función.
    await expect(page.getByRole('button', { name: 'Apagar PC' })).toBeVisible()
  })

  test('la prueba de encendido falla con la fuente corta y dice por qué', async ({ page }) => {
    await page.goto('/es/armar')
    await armadoCompleto(page, /MAG A650BN/)

    await page.getByRole('button', { name: 'Encender PC' }).click()

    // Una fuente por debajo de lo recomendado no es una incompatibilidad
    // física —el resumen la deja en aviso— pero sí impide declarar que el
    // equipo arranca. El diagnóstico tiene que nombrar la pieza culpable.
    await expect(page.getByText('No pudo encender').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'La fuente está por debajo de lo recomendado' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Probar de nuevo' })).toBeVisible()
  })

  test('un armado coherente no levanta advertencias y pasa entero al carrito', async ({ page }) => {
    await page.goto('/es/armar')
    await elegir(page, 'cpu', /Ryzen 7 9800X3D/)
    await elegir(page, 'motherboard', /MAG B850 TOMAHAWK/)
    await elegir(page, 'ram', /Vengeance DDR5 32 GB/)
    await elegir(page, 'gpu', /GeForce RTX 5080/)
    await elegir(page, 'psu', /RM1000x/)
    await elegir(page, 'case', /LANCOOL 216/)

    await expect(page.getByText('Sin advertencias por ahora.')).toBeVisible()
    await expect(page.getByText('Todo lo comprobado encaja')).toBeVisible()

    await page.getByRole('button', { name: 'Agregar el armado al carrito' }).click()
    await expect(page.getByRole('button', { name: 'Abrir carrito' })).toContainText('06')
  })
})

test.describe('estados vacíos y errores', () => {
  test('el catálogo sin resultados ofrece salir del callejón', async ({ page }) => {
    await page.goto('/es/catalogo?q=zzzzzz')
    await expect(page.getByText('Ninguna pieza coincide')).toBeVisible()
    await page.getByRole('button', { name: 'Restablecer filtros' }).first().click()
    await expect(page).toHaveURL(/\/es\/catalogo$/)
    await expect(page.getByRole('article').first()).toBeVisible()
  })

  test('los filtros viven en la URL y se pueden compartir', async ({ page }) => {
    await page.goto('/es/catalogo?categoria=procesadores')
    const articulos = page.getByRole('article')
    await expect(articulos.first()).toBeVisible()
    const total = await articulos.count()
    expect(total).toBe(5)
  })

  test('una dirección inexistente muestra el 404 de la casa', async ({ page }) => {
    const response = await page.goto('/es/producto/no-existe')
    expect(response?.status()).toBe(404)
    await expect(page.getByText('Esta dirección no existe')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver catálogo' })).toBeVisible()
  })
})

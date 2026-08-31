import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '@/lib/catalog/products'
import { PIEZAS_CON_FOTO, photoOf } from '@/lib/catalog/media'

/**
 * Las fotos son archivos en disco referenciados por convención de nombre. Nada
 * en el compilador impide que alguien renombre un slug y deje la imagen
 * huérfana: eso lo tiene que atrapar una prueba.
 */

const RAIZ = join(process.cwd(), 'public', 'products')

describe('fotografía de producto', () => {
  it('todas las piezas del catálogo tienen su archivo en disco', () => {
    const sinArchivo = PRODUCTS.filter(
      (p) => !existsSync(join(RAIZ, p.slug, 'primary.webp')),
    ).map((p) => p.slug)

    expect(sinArchivo, `piezas sin foto: ${sinArchivo.join(', ')}`).toEqual([])
  })

  it('el manifiesto cubre el catálogo entero', () => {
    expect(PIEZAS_CON_FOTO).toBeGreaterThanOrEqual(PRODUCTS.length)
  })

  it('devuelve la ruta local y el crédito de la pieza', () => {
    const foto = photoOf('geforce-rtx-5080-16gb', 'GeForce RTX 5080 16 GB')
    expect(foto?.src).toBe('/products/geforce-rtx-5080-16gb/primary.webp')
    expect(foto?.credit).toBeTruthy()
    expect(foto?.alt.es).toContain('GeForce RTX 5080')
    expect(foto?.alt.pt).toContain('Fotografia')
  })

  it('lo que carga el operador manda sobre la foto local', () => {
    const foto = photoOf('geforce-rtx-5080-16gb', 'RTX 5080', [
      { url: 'https://ejemplo.test/propia.webp', alt_es: 'La mía', alt_pt: 'A minha' },
    ])
    expect(foto?.src).toBe('https://ejemplo.test/propia.webp')
    expect(foto?.alt.es).toBe('La mía')
    // Una imagen cargada por el operador no lleva crédito de fabricante.
    expect(foto?.credit).toBeNull()
  })

  it('una pieza sin foto devuelve null para que se dibuje el render', () => {
    expect(photoOf('pieza-que-no-existe', 'Pieza nueva')).toBeNull()
  })

  it('cae al nombre del producto si la imagen del operador no trae alt', () => {
    const foto = photoOf('x', 'Pieza X', [{ url: 'https://ejemplo.test/a.webp', alt_es: '', alt_pt: '' }])
    expect(foto?.alt.es).toBe('Pieza X')
    expect(foto?.alt.pt).toBe('Pieza X')
  })
})

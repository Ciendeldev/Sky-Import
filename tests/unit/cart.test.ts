import { beforeEach, describe, expect, it } from 'vitest'
import { useCart, resolveLines, totalsOf } from '@/lib/cart'
import { PRODUCTS } from '@/lib/catalog/products'

const gpu = PRODUCTS.find((product) => product.slug === 'geforce-rtx-5070-12gb')!
const paste = PRODUCTS.find((product) => product.slug === 'thermal-grizzly-kryonaut-1g')!

describe('carrito', () => {
  beforeEach(() => {
    useCart.setState({ lines: [], lastRemoved: null })
  })

  it('agrega y acumula la misma pieza en una sola línea', () => {
    useCart.getState().add(gpu.slug)
    useCart.getState().add(gpu.slug, 2)
    const lines = useCart.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0]?.qty).toBe(3)
  })

  it('nunca deja pedir más unidades de las configuradas', () => {
    useCart.getState().add(gpu.slug, 999)
    expect(useCart.getState().lines[0]?.qty).toBe(gpu.units)
    useCart.getState().setQty(gpu.slug, 999)
    expect(useCart.getState().lines[0]?.qty).toBe(gpu.units)
  })

  it('ignora un slug que no existe en el catálogo', () => {
    useCart.getState().add('pieza-inventada')
    expect(useCart.getState().lines).toHaveLength(0)
  })

  it('poner la cantidad en cero equivale a quitar la línea', () => {
    useCart.getState().add(gpu.slug, 2)
    useCart.getState().setQty(gpu.slug, 0)
    expect(useCart.getState().lines).toHaveLength(0)
  })

  it('deshacer devuelve la línea a su posición original', () => {
    useCart.getState().add(gpu.slug)
    useCart.getState().add(paste.slug)
    useCart.getState().remove(gpu.slug)
    expect(useCart.getState().lines.map((line) => line.slug)).toEqual([paste.slug])

    useCart.getState().undoRemove()
    expect(useCart.getState().lines.map((line) => line.slug)).toEqual([gpu.slug, paste.slug])
  })

  it('vaciar deja el carrito sin líneas y sin nada que deshacer', () => {
    useCart.getState().add(gpu.slug)
    useCart.getState().clear()
    expect(useCart.getState().lines).toHaveLength(0)
    useCart.getState().undoRemove()
    expect(useCart.getState().lines).toHaveLength(0)
  })

  it('resuelve líneas contra el catálogo y descarta las huérfanas', () => {
    const resolved = resolveLines([
      { slug: gpu.slug, qty: 2 },
      { slug: 'pieza-que-ya-no-esta', qty: 1 },
    ])
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.lineTotalUsd).toBe(gpu.priceUsd * 2)
  })
})

describe('totales', () => {
  /**
   * El carrito ya no estima el envío. No puede: el flete depende de la ciudad,
   * y la ciudad se elige en el checkout. Antes cobraba una tarifa general y la
   * regalaba por encima de un umbral, y las dos cosas eran falsas.
   */
  it('suma las líneas y nada más', () => {
    const totals = totalsOf(resolveLines([{ slug: paste.slug, qty: 2 }]))
    expect(totals.subtotalUsd).toBe(paste.priceUsd * 2)
    expect(totals.count).toBe(2)
  })

  it('un carrito vacío está en cero', () => {
    expect(totalsOf([])).toEqual({ count: 0, subtotalUsd: 0 })
  })

  it('no expone ningún total con envío que después haya que corregir', () => {
    const totals = totalsOf(resolveLines([{ slug: gpu.slug, qty: 1 }]))
    expect(Object.keys(totals).sort()).toEqual(['count', 'subtotalUsd'])
  })
})

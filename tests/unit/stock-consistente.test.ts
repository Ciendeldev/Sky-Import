import { describe, expect, it } from 'vitest'
import { availableUnits } from '@/lib/catalog/stock'

describe('stock vendible compartido por catálogo, inventario y alertas', () => {
  it('usa las variantes activas aunque el contador base esté desactualizado', () => {
    expect(availableUnits(99, [{ units: 0, active: true }, { units: 2, active: true }, { units: 40, active: false }])).toBe(2)
  })
  it('no oculta un agotado con el saldo del producto base', () => {
    expect(availableUnits(99, [{ units: 0, active: true }])).toBe(0)
  })
  it('sin variantes activas utiliza el producto base, como place_order', () => {
    expect(availableUnits(4, [{ units: 100, active: false }])).toBe(4)
    expect(availableUnits(4)).toBe(4)
  })
})

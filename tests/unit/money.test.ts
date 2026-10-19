import { describe, expect, it } from 'vitest'
// Tasas de prueba: el módulo ya no lee ninguna tasa por su cuenta.
const FX = { PYG: 7400, BRL: 5.4 }
import {
  CURRENCIES,
  allCurrencies,
  convert,
  discountPercent,
  formatMoney,
  isCurrency,
} from '@/lib/money'

describe('moneda', () => {
  it('formatea el dólar con separador de miles y sin decimales', () => {
    expect(formatMoney(1249, 'USD', FX)).toBe('US$ 1.249')
    expect(formatMoney(59, 'USD', FX)).toBe('US$ 59')
    expect(formatMoney(0, 'USD', FX)).toBe('US$ 0')
  })

  it('deriva el guaraní con la tasa recibida y redondeo de vitrina al millar', () => {
    // 1249 × 7400 = 9.242.600 → al millar más cercano, 9.243.000.
    expect(convert(1249, 'PYG', FX)).toBe(9_243_000)
    expect(formatMoney(1249, 'PYG', FX)).toBe('₲ 9.243.000')
    // Un importe que ya cae en millar redondo no se mueve.
    expect(convert(100, 'PYG', FX)).toBe(100 * FX.PYG)
    // Un importe que no cae en millar redondo se redondea.
    expect(convert(12.5, 'PYG', FX) % 1000).toBe(0)
  })

  it('usa la tasa vigente que le pasan: cambiarla en el panel cambia la vitrina', () => {
    expect(formatMoney(100, 'PYG', { ...FX, PYG: 7800 })).toBe('₲ 780.000')
    expect(formatMoney(100, 'BRL', { ...FX, BRL: 5.39 })).toBe('R$ 539,00')
  })

  it('deriva el real con coma decimal', () => {
    expect(formatMoney(1249, 'BRL', FX)).toBe('R$ 6.744,60')
    expect(formatMoney(100, 'BRL', FX)).toBe('R$ 540,00')
  })

  it('produce la misma cadena en llamadas repetidas — es determinista', () => {
    const once = allCurrencies(849, FX).map((entry) => entry.text)
    const twice = allCurrencies(849, FX).map((entry) => entry.text)
    expect(once).toEqual(twice)
    expect(once).toHaveLength(CURRENCIES.length)
  })

  it('no usa Intl: el mismo importe da la misma cadena bajo otra configuración regional', () => {
    // Si alguien reintrodujera Intl, este texto cambiaría según el entorno.
    expect(formatMoney(1234567, 'PYG', FX)).toContain('.')
    expect(formatMoney(1234567, 'PYG', FX)).not.toContain(',')
  })

  it('valida códigos de moneda', () => {
    expect(isCurrency('USD')).toBe(true)
    expect(isCurrency('EUR')).toBe(false)
  })

  it('deriva el descuento de los datos y no lo declara', () => {
    expect(discountPercent(849, 929)).toBe(9)
    expect(discountPercent(849, undefined)).toBeNull()
    // Un «precio anterior» menor no es una oferta.
    expect(discountPercent(849, 800)).toBeNull()
  })
})

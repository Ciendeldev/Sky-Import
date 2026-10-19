/**
 * Dinero formateado a mano.
 *
 * Deliberadamente NO se usa `Intl.NumberFormat`: servidor y navegador pueden
 * producir cadenas distintas (espacio duro vs. espacio normal, separadores según
 * la versión de ICU) y eso rompe la hidratación de React. Estas funciones son
 * puras y deterministas, así que las tres monedas se pueden imprimir en el HTML
 * del servidor y quedarse ahí.
 *
 * El USD es la fuente de verdad. PYG y BRL se derivan con la tasa VIGENTE y se
 * redondean «de vitrina»: nadie publica ₲ 9.242.617.
 *
 * La tasa es un parámetro obligatorio, no una constante importada. Mientras
 * fue una constante, el panel podía cambiarla en la base y la vitrina seguía
 * convirtiendo con la del archivo sin que nada avisara. Obligatoria, cualquier
 * llamada que se olvide de la tasa vigente no compila.
 */

import type { Rates } from '@/lib/catalog/live'

export const CURRENCIES = ['USD', 'PYG', 'BRL'] as const
export type Currency = (typeof CURRENCIES)[number]

export const DEFAULT_CURRENCY: Currency = 'USD'

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value)
}

/** Agrupa la parte entera con puntos: 9242600 -> "9.242.600". */
function groupThousands(intPart: string): string {
  let out = ''
  for (let i = 0; i < intPart.length; i += 1) {
    const fromEnd = intPart.length - i
    out += intPart[i]
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) out += '.'
  }
  return out
}

/** Formatea un número no negativo con separador de miles y coma decimal. */
function formatNumber(value: number, decimals: number): string {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor)
  const intPart = Math.floor(rounded / factor).toString()
  const grouped = groupThousands(intPart)
  if (decimals === 0) return grouped
  const frac = (rounded % factor).toString().padStart(decimals, '0')
  return `${grouped},${frac}`
}

/** Convierte un importe en USD a la moneda pedida, con redondeo de vitrina. */
export function convert(usd: number, currency: Currency, rates: Rates): number {
  switch (currency) {
    case 'USD':
      return Math.round(usd * 100) / 100
    case 'PYG':
      // Al millar más cercano: en guaraníes nadie cotiza unidades.
      return Math.round((usd * rates.PYG) / 1000) * 1000
    case 'BRL':
      // Al décimo de real más cercano.
      return Math.round(usd * rates.BRL * 10) / 10
  }
}

export const CURRENCY_META: Record<
  Currency,
  { symbol: string; decimals: number; label: string; note: 'source' | 'derived' }
> = {
  USD: { symbol: 'US$', decimals: 0, label: 'Dólar', note: 'source' },
  PYG: { symbol: '₲', decimals: 0, label: 'Guaraní', note: 'derived' },
  BRL: { symbol: 'R$', decimals: 2, label: 'Real', note: 'derived' },
}

/** `formatMoney(1249, 'BRL', { PYG: 7400, BRL: 5.4 })` -> `"R$ 6.744,60"`. */
export function formatMoney(usd: number, currency: Currency, rates: Rates): string {
  const meta = CURRENCY_META[currency]
  const amount = convert(usd, currency, rates)
  return `${meta.symbol} ${formatNumber(amount, meta.decimals)}`
}

/** Las tres representaciones de un mismo importe, para imprimirlas todas. */
export function allCurrencies(
  usd: number,
  rates: Rates,
): Array<{ currency: Currency; text: string }> {
  return CURRENCIES.map((currency) => ({ currency, text: formatMoney(usd, currency, rates) }))
}

/** Descuento porcentual entero derivado de los datos, nunca declarado a mano. */
export function discountPercent(priceUsd: number, listUsd: number | undefined): number | null {
  if (!listUsd || listUsd <= priceUsd) return null
  return Math.round(((listUsd - priceUsd) / listUsd) * 100)
}

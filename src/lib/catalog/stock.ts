interface StockVariant { units: number; active: boolean }

/** Las variantes activas son la fuente del stock vendible cuando existen. */
export function availableUnits(baseUnits: number, variants: readonly StockVariant[] = []): number {
  const active = variants.filter(v => v.active)
  return active.length ? active.reduce((sum, v) => sum + v.units, 0) : baseUnits
}

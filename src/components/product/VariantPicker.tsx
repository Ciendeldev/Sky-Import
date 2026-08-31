'use client'

import { useI18n } from '@/lib/i18n/context'
import { axesOf, type Variant } from '@/lib/variants'

/**
 * SELECTOR DE VARIANTES
 *
 * Una fila por eje. Los ejes salen de las propias variantes, así que no puede
 * haber un eje declarado que ninguna pieza use.
 *
 * Un valor que no lleva a ninguna variante con stock se marca agotado, pero
 * **sigue siendo elegible**: ocultarlo dejaría al cliente sin saber que esa
 * versión existe. Es la misma decisión que toma el catálogo con las piezas sin
 * unidades.
 */
export function VariantPicker({
  variants,
  selection,
  onSelect,
}: {
  variants: Variant[]
  selection: Record<string, string>
  onSelect: (axis: string, value: string) => void
}) {
  const { t, locale } = useI18n()
  const axes = axesOf(variants)

  if (axes.length === 0) return null

  return (
    <div className="mt-7 flex flex-col gap-5">
      {axes.map((axis) => (
        <fieldset key={axis.name}>
          <legend className="u-label flex items-baseline gap-2">
            {axis.name}
            <span className="text-fg" aria-live="polite">
              {selection[axis.name] ?? ''}
            </span>
          </legend>

          <div className="mt-2.5 flex flex-wrap gap-2">
            {axis.values.map((value) => {
              const elegido = selection[axis.name] === value
              // ¿Existe alguna variante con este valor y stock, respetando el
              // resto de los ejes ya elegidos?
              const disponible = variants.some(
                (v) =>
                  v.attributes[axis.name] === value &&
                  v.units > 0 &&
                  Object.entries(selection).every(
                    ([k, val]) => k === axis.name || v.attributes[k] === val,
                  ),
              )

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelect(axis.name, value)}
                  aria-pressed={elegido}
                  className={`u-tap min-h-[44px] border px-3.5 rounded-part font-mono text-[0.75rem] transition-colors duration-200 ease-rail ${
                    elegido
                      ? 'border-accent text-fg'
                      : 'border-rule text-fg-mid hover:border-fg-low hover:text-fg'
                  } ${!disponible ? 'opacity-55' : ''}`}
                >
                  {value}
                  {!disponible ? (
                    <span className="ml-2 text-[0.625rem] text-amber">
                      {t('product.availability.agotado')}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {/* El SKU cambia con la variante y es lo que se dicta por teléfono. */}
      <p className="u-label tabular-nums" aria-live="polite">
        {t('product.ref')}{' '}
        <span className="text-fg">
          {variants.find((v) =>
            Object.entries(selection).every(([k, val]) => v.attributes[k] === val),
          )?.sku ?? '—'}
        </span>
        <span className="sr-only">
          {' · '}
          {variants.find((v) =>
            Object.entries(selection).every(([k, val]) => v.attributes[k] === val),
          )?.label[locale] ?? ''}
        </span>
      </p>
    </div>
  )
}

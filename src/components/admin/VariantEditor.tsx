'use client'

import { useState, useTransition } from 'react'
import { deleteVariant, saveVariant, type ActionResult } from '@/lib/admin/actions'
import type { VariantRow } from '@/lib/supabase/types'

/**
 * VARIANTES CON EJES ABIERTOS
 *
 * En una tienda de componentes, una variante no es «talla»: es capacidad,
 * velocidad, formato, longitud de radiador o color del gabinete. Cada pieza
 * declara los ejes que le corresponden en vez de arrastrar tres columnas fijas
 * que quedan vacías para la mitad del catálogo.
 *
 * Cada variante lleva su propio SKU, su stock y —opcionalmente— su precio y su
 * foto. Eso es lo que permite que en la ficha, al cambiar de variante, cambien
 * los tres a la vez.
 */

/** Ejes que aparecen de verdad en componentes de PC, para no escribirlos a mano. */
const EJES_SUGERIDOS = [
  'Capacidad',
  'Color',
  'Velocidad',
  'Formato',
  'Memoria',
  'Longitud',
  'Potencia',
  'Ventiladores',
]

interface Par {
  key: string
  value: string
}

function VariantRowForm({
  productId,
  variant,
  onDone,
}: {
  productId: string
  variant?: VariantRow
  onDone: () => void
}) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pares, setPares] = useState<Par[]>(
    variant && Object.keys(variant.attributes).length > 0
      ? Object.entries(variant.attributes).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }],
  )

  return (
    <form
      className="a-panel a-panel--pad"
      action={(formData) =>
        start(async () => {
          const res = await saveVariant(formData)
          setResult(res)
          if (res.ok) onDone()
        })
      }
    >
      {variant ? <input type="hidden" name="id" value={variant.id} /> : null}
      <input type="hidden" name="product_id" value={productId} />

      <div className="a-grid a-grid--3">
        <div>
          <label className="a-label">SKU</label>
          <input
            name="sku"
            className="a-field a-num"
            defaultValue={variant?.sku}
            placeholder="SI-SSD-0410-2TB"
            required
          />
        </div>

        <div>
          <label className="a-label">Nombre visible</label>
          <input
            name="label_es"
            className="a-field"
            defaultValue={variant?.label_es}
            placeholder="2 TB · Negro"
            required
          />
        </div>

        <div>
          <label className="a-label">Nombre en portugués</label>
          <input
            name="label_pt"
            className="a-field"
            defaultValue={variant?.label_pt}
            placeholder="igual que el español si se deja vacío"
          />
        </div>

        <div>
          <label className="a-label">Precio propio (US$)</label>
          <input
            name="price_usd"
            type="number"
            step="0.01"
            min="0"
            className="a-field a-num"
            defaultValue={variant?.price_usd ?? ''}
            placeholder="hereda el del producto"
          />
        </div>

        <div>
          <label className="a-label">Unidades</label>
          <input
            name="units"
            type="number"
            step="1"
            min="0"
            className="a-field a-num"
            defaultValue={variant?.units ?? 0}
          />
        </div>

        <div>
          <label className="a-label">Orden</label>
          <input
            name="sort_order"
            type="number"
            step="1"
            className="a-field a-num"
            defaultValue={variant?.sort_order ?? 0}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="a-label">Imagen propia</label>
        <input
          name="image_url"
          type="url"
          className="a-field"
          defaultValue={variant?.image_url ?? ''}
          placeholder="https://…  ·  vacío = el dibujo del producto"
        />
        <p className="a-hint">Al elegir esta variante, la ficha cambia a esta foto.</p>
      </div>

      {/* ── los ejes ── */}
      <fieldset className="mt-5">
        <legend className="a-label">Ejes de esta variante</legend>

        {pares.map((par, i) => (
          <div key={i} className="mt-2 flex flex-wrap items-center gap-2">
            <input
              name="attr_key"
              className="a-field flex-1 min-w-[130px]"
              list="ejes-sugeridos"
              value={par.key}
              onChange={(e) =>
                setPares((prev) =>
                  prev.map((p, j) => (j === i ? { ...p, key: e.target.value } : p)),
                )
              }
              placeholder="Capacidad"
              aria-label={`Nombre del eje ${i + 1}`}
            />
            <input
              name="attr_value"
              className="a-field flex-1 min-w-[130px]"
              value={par.value}
              onChange={(e) =>
                setPares((prev) =>
                  prev.map((p, j) => (j === i ? { ...p, value: e.target.value } : p)),
                )
              }
              placeholder="2 TB"
              aria-label={`Valor del eje ${i + 1}`}
            />
            <button
              type="button"
              className="a-btn a-btn--sm a-btn--danger"
              onClick={() => setPares((prev) => prev.filter((_, j) => j !== i))}
              aria-label={`Quitar el eje ${i + 1}`}
            >
              Quitar
            </button>
          </div>
        ))}

        <datalist id="ejes-sugeridos">
          {EJES_SUGERIDOS.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>

        <button
          type="button"
          className="a-btn a-btn--sm mt-3"
          onClick={() => setPares((prev) => [...prev, { key: '', value: '' }])}
        >
          Agregar eje
        </button>
      </fieldset>

      <label className="mt-4 flex items-center gap-2.5 text-[0.875rem] text-fg-mid">
        <input
          type="checkbox"
          name="active"
          defaultChecked={variant?.active ?? true}
          className="size-4 accent-[var(--accent)]"
        />
        Disponible en la tienda
      </label>

      {result && !result.ok ? (
        <p className="a-note a-note--error mt-4" role="alert">
          {result.error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-3">
        <button type="submit" className="a-btn a-btn--solid" disabled={pending}>
          {pending ? 'Guardando…' : variant ? 'Guardar variante' : 'Crear variante'}
        </button>
        <button type="button" className="a-btn" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function VariantEditor({
  productId,
  variants,
}: {
  productId: string
  variants: VariantRow[]
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, start] = useTransition()

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="a-eyebrow">Variantes</h2>
          <p className="a-hint mt-1">
            Con variantes cargadas, el stock de la pieza pasa a ser la suma de las activas.
          </p>
        </div>
        {!creating ? (
          <button type="button" className="a-btn" onClick={() => setCreating(true)}>
            Agregar variante
          </button>
        ) : null}
      </div>

      {creating ? (
        <div className="mt-4">
          <VariantRowForm productId={productId} onDone={() => setCreating(false)} />
        </div>
      ) : null}

      {variants.length === 0 && !creating ? (
        <p className="a-hint mt-4">
          Esta pieza no tiene variantes. Se vende como una sola referencia, con el SKU y el stock del
          producto.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {variants.map((v) =>
          editing === v.id ? (
            <VariantRowForm
              key={v.id}
              productId={productId}
              variant={v}
              onDone={() => setEditing(null)}
            />
          ) : (
            <div
              key={v.id}
              className="a-panel flex flex-wrap items-center gap-x-5 gap-y-2 p-4"
            >
              <span className="min-w-[140px] flex-1">
                <span className="block text-[0.9375rem] text-fg">{v.label_es}</span>
                <span className="a-num block text-[0.75rem] text-fg-low">{v.sku}</span>
              </span>

              <span className="flex flex-wrap gap-1.5">
                {Object.entries(v.attributes).map(([k, val]) => (
                  <span key={k} className="a-tag a-tag--ok">
                    {k}: {val}
                  </span>
                ))}
              </span>

              <span className="a-num text-[0.8125rem] text-fg-mid">
                {v.price_usd !== null ? `US$ ${Number(v.price_usd).toFixed(0)}` : 'precio base'}
              </span>

              <span className="a-num text-[0.8125rem]">
                {v.units} u.
                {v.units === 0 ? <span className="ml-2 text-rust">agotada</span> : null}
              </span>

              {!v.active ? <span className="a-tag a-tag--ok">Oculta</span> : null}

              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  className="a-btn a-btn--sm"
                  onClick={() => setEditing(v.id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="a-btn a-btn--sm a-btn--danger"
                  disabled={pending}
                  onClick={() => start(async () => void (await deleteVariant(v.id)))}
                >
                  Eliminar
                </button>
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { saveFx, saveRules, type ActionResult } from '@/lib/admin/actions'
import type { FxSettings, RulesSettings } from '@/lib/supabase/types'

/**
 * Un solo sitio donde se cambian la tasa y los umbrales comerciales. No hay una
 * segunda copia de estos números en ningún componente: la tienda entera los lee
 * de acá.
 */

function Aviso({ result }: { result: ActionResult | null }) {
  if (!result) return null
  return (
    <p className={`a-note mt-4 ${result.ok ? 'a-note--ok' : 'a-note--error'}`} role="status">
      {result.ok ? result.message : result.error}
    </p>
  )
}

export function FxForm({ fx }: { fx: FxSettings }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pyg, setPyg] = useState(String(fx.PYG))

  const ejemplo = Number(pyg) > 0 ? Math.round((1000 * Number(pyg)) / 1000) * 1000 : 0

  return (
    <form
      className="a-panel a-panel--pad"
      action={(formData) => start(async () => setResult(await saveFx(formData)))}
    >
      <h2 className="a-eyebrow">Tasa de cambio</h2>

      <div className="mt-4">
        <label className="a-label" htmlFor="PYG">
          Guaraníes por dólar
        </label>
        <input
          id="PYG"
          name="PYG"
          type="number"
          step="1"
          min="1"
          className="a-field a-num"
          value={pyg}
          onChange={(e) => setPyg(e.target.value)}
          required
        />
        <p className="a-hint">
          Con esta tasa, una pieza de US$ 1.000 se publica como Gs.{' '}
          <span className="a-num">{ejemplo.toLocaleString('es-PY')}</span>.
        </p>
      </div>

      <div className="mt-4">
        <label className="a-label" htmlFor="BRL">
          Reales por dólar
        </label>
        <input
          id="BRL"
          name="BRL"
          type="number"
          step="0.01"
          min="0.01"
          className="a-field a-num"
          defaultValue={fx.BRL}
          required
        />
      </div>

      <div className="mt-4">
        <label className="a-label" htmlFor="reference">
          Mes de referencia
        </label>
        <input
          id="reference"
          name="reference"
          className="a-field a-num"
          defaultValue={fx.reference}
          placeholder="2026-08"
        />
        <p className="a-hint">
          Se muestra junto a los importes derivados. La tienda nunca afirma que sea una cotización
          en vivo.
        </p>
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-[0.875rem] text-fg-mid">
        <input
          type="checkbox"
          name="auto"
          defaultChecked={fx.auto}
          className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
        />
        <span>
          Marcar como actualización automática
          <span className="a-hint mt-1 block">
            Solo cambia el rótulo. Mientras no haya una fuente de cotización conectada, el valor lo
            sigue poniendo esta pantalla.
          </span>
        </span>
      </label>

      <Aviso result={result} />

      <button type="submit" className="a-btn a-btn--solid mt-5" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar tasa'}
      </button>

      <p className="a-hint mt-4">
        Última actualización:{' '}
        <span className="a-num">{new Date(fx.updated_at).toLocaleString('es-PY')}</span>
      </p>
    </form>
  )
}

export function RulesForm({ rules }: { rules: RulesSettings }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  return (
    <form
      className="a-panel a-panel--pad"
      action={(formData) => start(async () => setResult(await saveRules(formData)))}
    >
      <h2 className="a-eyebrow">Umbrales comerciales</h2>

      <div className="mt-4">
        <label className="a-label" htmlFor="lowStockAt">
          Aviso de últimas unidades
        </label>
        <input
          id="lowStockAt"
          name="lowStockAt"
          type="number"
          step="1"
          min="0"
          className="a-field a-num"
          defaultValue={rules.lowStockAt}
        />
        <p className="a-hint">
          A esta cantidad o menos, la pieza muestra «últimas unidades» en la tienda y salta en las
          alertas del tablero.
        </p>
      </div>

      {/* El envío ya no se configura acá. Dependía de dos números generales
          —un umbral de bonificación y una tarifa única— que contradecían el
          costo real de cada zona. Ahora el flete vive en `shipping_zones`,
          ciudad por ciudad, y no hay envío bonificado que ajustar. */}

      <Aviso result={result} />

      <button type="submit" className="a-btn a-btn--solid mt-5" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar umbrales'}
      </button>
    </form>
  )
}

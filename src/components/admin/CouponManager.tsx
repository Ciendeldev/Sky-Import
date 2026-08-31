'use client'

import { useState, useTransition } from 'react'
import { deleteCoupon, saveCoupon, type ActionResult } from '@/lib/admin/actions'
import type { CouponRow } from '@/lib/supabase/types'

/** `2026-08-31T14:00:00Z` → `2026-08-31T11:00`, que es lo que espera el input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Estado = 'activo' | 'agotado' | 'vencido' | 'programado' | 'apagado'

/**
 * El estado se DERIVA de los datos, igual que la disponibilidad de un producto.
 * No hay una columna «estado» que pueda contradecir a la fecha de vencimiento.
 */
function estadoDe(c: CouponRow): Estado {
  if (!c.active) return 'apagado'
  if (c.max_uses !== null && c.used_count >= c.max_uses) return 'agotado'
  if (c.expires_at && new Date(c.expires_at) < new Date()) return 'vencido'
  if (c.starts_at && new Date(c.starts_at) > new Date()) return 'programado'
  return 'activo'
}

const TONO: Record<Estado, string> = {
  activo: 'a-tag--info',
  programado: 'a-tag--ok',
  agotado: 'a-tag--warn',
  vencido: 'a-tag--warn',
  apagado: 'a-tag--ok',
}

function CouponForm({ coupon, onDone }: { coupon?: CouponRow; onDone: () => void }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [kind, setKind] = useState(coupon?.kind ?? 'percent')

  return (
    <form
      className="a-panel a-panel--pad"
      action={(formData) =>
        start(async () => {
          const res = await saveCoupon(formData)
          setResult(res)
          if (res.ok) onDone()
        })
      }
    >
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}

      <div className="a-grid a-grid--3">
        <div>
          <label className="a-label">Código</label>
          <input
            name="code"
            className="a-field a-num uppercase"
            defaultValue={coupon?.code}
            placeholder="SKY10"
            required
          />
          <p className="a-hint">No distingue mayúsculas al canjearlo.</p>
        </div>

        <div>
          <label className="a-label">Tipo</label>
          <select
            name="kind"
            className="a-field"
            value={kind}
            onChange={(e) => setKind(e.target.value as CouponRow['kind'])}
          >
            <option value="percent">Porcentaje</option>
            <option value="fixed">Monto fijo en dólares</option>
          </select>
        </div>

        <div>
          <label className="a-label">{kind === 'percent' ? 'Porcentaje' : 'Monto (US$)'}</label>
          <input
            name="value"
            type="number"
            step={kind === 'percent' ? '1' : '0.01'}
            min="0.01"
            max={kind === 'percent' ? 100 : undefined}
            className="a-field a-num"
            defaultValue={coupon?.value}
            required
          />
        </div>

        <div>
          <label className="a-label">Compra mínima (US$)</label>
          <input
            name="min_purchase_usd"
            type="number"
            step="1"
            min="0"
            className="a-field a-num"
            defaultValue={coupon?.min_purchase_usd ?? 0}
          />
        </div>

        <div>
          <label className="a-label">Límite de usos</label>
          <input
            name="max_uses"
            type="number"
            step="1"
            min="1"
            className="a-field a-num"
            defaultValue={coupon?.max_uses ?? ''}
            placeholder="sin límite"
          />
        </div>

        <div>
          <label className="a-label">Vence el</label>
          <input
            name="expires_at"
            type="datetime-local"
            className="a-field a-num"
            defaultValue={toLocalInput(coupon?.expires_at ?? null)}
          />
        </div>

        <div>
          <label className="a-label">Empieza el</label>
          <input
            name="starts_at"
            type="datetime-local"
            className="a-field a-num"
            defaultValue={toLocalInput(coupon?.starts_at ?? null)}
          />
          <p className="a-hint">Vacío = vale desde ahora.</p>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2.5 text-[0.875rem] text-fg-mid">
        <input
          type="checkbox"
          name="active"
          defaultChecked={coupon?.active ?? true}
          className="size-4 accent-[var(--accent)]"
        />
        Activo
      </label>

      {result && !result.ok ? (
        <p className="a-note a-note--error mt-4" role="alert">
          {result.error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button type="submit" className="a-btn a-btn--solid" disabled={pending}>
          {pending ? 'Guardando…' : coupon ? 'Guardar cupón' : 'Crear cupón'}
        </button>
        <button type="button" className="a-btn" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <>
      <div className="mt-6">
        {creating ? (
          <CouponForm onDone={() => setCreating(false)} />
        ) : (
          <button type="button" className="a-btn a-btn--solid" onClick={() => setCreating(true)}>
            Nuevo cupón
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-4">
          <CouponForm
            coupon={coupons.find((c) => c.id === editing)}
            onDone={() => setEditing(null)}
          />
        </div>
      ) : null}

      {coupons.length === 0 ? (
        <p className="a-hint mt-6">Todavía no hay cupones.</p>
      ) : (
        <div className="a-panel a-scroll mt-6">
          <table className="a-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th>Mínimo</th>
                <th>Usos</th>
                <th>Vence</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const estado = estadoDe(c)
                return (
                  <tr key={c.id}>
                    <td className="a-num text-fg">{c.code}</td>
                    <td className="a-num">
                      {c.kind === 'percent'
                        ? `${Number(c.value)} %`
                        : `US$ ${Number(c.value).toFixed(2)}`}
                    </td>
                    <td className="a-num text-fg-mid">
                      {Number(c.min_purchase_usd) > 0
                        ? `US$ ${Number(c.min_purchase_usd).toFixed(0)}`
                        : '—'}
                    </td>
                    <td className="a-num text-fg-mid">
                      {c.used_count}
                      {c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="a-num text-fg-mid">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-PY') : '—'}
                    </td>
                    <td>
                      <span className={`a-tag ${TONO[estado]}`}>{estado}</span>
                    </td>
                    <td>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className="a-btn a-btn--sm"
                          onClick={() => setEditing(c.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="a-btn a-btn--sm a-btn--danger"
                          disabled={pending}
                          onClick={() => start(async () => void (await deleteCoupon(c.id)))}
                        >
                          Eliminar
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

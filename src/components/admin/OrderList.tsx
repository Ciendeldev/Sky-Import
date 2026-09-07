'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { deleteOrder, setOrderNote, setOrderStatus } from '@/lib/admin/actions'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/supabase/types'
import type { OrderWithItems } from '@/lib/admin/queries'
import { waPhone } from '@/lib/whatsapp'

/**
 * El historial de pedidos. Cada fila se abre para ver las líneas, los datos de
 * entrega y la nota interna.
 *
 * Los importes que se muestran son los GRABADOS en el pedido, no recalculados:
 * un pedido de hace un mes tiene que seguir mostrando el total que se le dijo al
 * cliente, aunque el precio de la pieza haya cambiado desde entonces.
 */

const ETIQUETA: Record<OrderStatus, string> = {
  iniciado_whatsapp: 'Iniciado por WhatsApp',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const TONO: Record<OrderStatus, string> = {
  iniciado_whatsapp: 'a-tag--info',
  confirmado: 'a-tag--ok',
  preparando: 'a-tag--warn',
  entregado: 'a-tag--ok',
  cancelado: 'a-tag--stop',
}

function gs(pygAmount: number): string {
  return `Gs. ${Math.round(pygAmount).toLocaleString('es-PY')}`
}

function OrderDetail({ order, canDelete }: { order: OrderWithItems; canDelete: boolean }) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState(order.admin_note)
  const [saved, setSaved] = useState(false)
  // Confirmar tecleando el número es más lento que un «¿estás seguro?» y esa
  // es la idea: no hay papelera, y el pedido de al lado se parece a este.
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [failed, setFailed] = useState<string | null>(null)

  // La tasa que se grabó con el pedido, no la de hoy.
  const aGs = (usd: number) => Math.round((usd * Number(order.fx_pyg)) / 1000) * 1000

  return (
    <tr>
      <td colSpan={7} className="bg-carbon-sunk">
        <div className="a-grid a-grid--2 p-1">
          <div>
            <h3 className="a-eyebrow">Piezas</h3>
            <ul className="mt-2">
              {order.order_items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline gap-x-3 border-b border-rule py-2 text-[0.875rem]"
                >
                  <span className="flex-1 text-fg">
                    {item.name}
                    {item.variant_label ? (
                      <span className="text-fg-mid"> · {item.variant_label}</span>
                    ) : null}
                  </span>
                  <span className="a-num text-[0.75rem] text-fg-low">{item.sku}</span>
                  <span className="a-num text-fg-mid">×{item.qty}</span>
                  <span className="a-num">{gs(aGs(Number(item.subtotal_usd)))}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 text-[0.875rem]">
              <div className="flex justify-between py-1">
                <dt className="text-fg-mid">Subtotal</dt>
                <dd className="a-num">{gs(aGs(Number(order.subtotal_usd)))}</dd>
              </div>
              {Number(order.discount_usd) > 0 ? (
                <div className="flex justify-between py-1">
                  <dt className="text-fg-mid">Cupón {order.coupon_code}</dt>
                  <dd className="a-num text-accent">−{gs(aGs(Number(order.discount_usd)))}</dd>
                </div>
              ) : null}
              <div className="flex justify-between py-1">
                <dt className="text-fg-mid">Envío · {order.zone_name}</dt>
                {/* El envío no tiene importe en el sistema: se acuerda en la
                    conversación. Decía «¡Gratis!», que hacía creer al operador
                    que ya estaba cobrado cuando no había nada cobrado.
                    La dirección vacía distingue el retiro por el local —única
                    zona que no la exige— de un envío pendiente de acordar. */}
                <dd className="a-num">
                  {Number(order.shipping_usd) > 0 ? (
                    gs(aGs(Number(order.shipping_usd)))
                  ) : (
                    <span className="text-fg-mid">
                      {order.address.trim() ? 'se acuerda por WhatsApp' : 'retira en el local'}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-rule py-2">
                <dt className="text-fg">Total de las piezas</dt>
                <dd className="a-num text-fg">{gs(Number(order.total_pyg))}</dd>
              </div>
            </dl>
            <p className="a-hint">
              Tasa grabada con el pedido: {Number(order.fx_pyg).toLocaleString('es-PY')} Gs./US$
            </p>
          </div>

          <div>
            <h3 className="a-eyebrow">Entrega</h3>
            <dl className="mt-2 text-[0.875rem]">
              <dt className="a-eyebrow mt-2">Nombre</dt>
              <dd className="text-fg">
                {order.first_name} {order.last_name}
              </dd>

              <dt className="a-eyebrow mt-3">Teléfono</dt>
              <dd>
                <a
                  href={`https://wa.me/${waPhone(order.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a-num text-accent underline"
                >
                  {order.phone}
                </a>
              </dd>

              <dt className="a-eyebrow mt-3">Zona</dt>
              <dd className="text-fg-mid">{order.zone_name}</dd>

              {order.address ? (
                <>
                  <dt className="a-eyebrow mt-3">Dirección</dt>
                  <dd className="text-fg-mid">{order.address}</dd>
                </>
              ) : null}

              {order.notes ? (
                <>
                  <dt className="a-eyebrow mt-3">Notas del cliente</dt>
                  <dd className="text-fg-mid">{order.notes}</dd>
                </>
              ) : null}
            </dl>

            <div className="mt-5">
              <label className="a-label" htmlFor={`nota-${order.id}`}>
                Nota interna
              </label>
              <textarea
                id={`nota-${order.id}`}
                className="a-field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="El cliente pasa el martes. Señó Gs. 500.000."
              />
              <p className="a-hint">No la ve el cliente.</p>
              <button
                type="button"
                className="a-btn a-btn--sm mt-2"
                disabled={pending || note === order.admin_note}
                onClick={() =>
                  start(async () => {
                    await setOrderNote(order.id, note)
                    setSaved(true)
                    window.setTimeout(() => setSaved(false), 1600)
                  })
                }
              >
                {pending ? 'Guardando…' : saved ? 'Guardada ✓' : 'Guardar nota'}
              </button>
            </div>

            {canDelete ? (
              <div className="mt-6 border-t border-rule pt-4">
                <h3 className="a-eyebrow">Borrar pedido</h3>
                {confirming ? (
                  <>
                    <p className="a-hint mt-2">
                      Escribí <strong className="a-num text-fg">{order.number}</strong> para confirmar. Se
                      borra para siempre
                      {order.status === 'entregado'
                        ? '; como está entregado, el stock no se toca.'
                        : ' y sus unidades vuelven al stock.'}
                    </p>
                    <input
                      className="a-field a-num mt-2"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      aria-label={`Escribí ${order.number} para confirmar`}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="a-btn a-btn--sm"
                        onClick={() => {
                          setConfirming(false)
                          setTyped('')
                          setFailed(null)
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="a-btn a-btn--sm a-btn--danger"
                        disabled={pending || typed.trim().toUpperCase() !== order.number.toUpperCase()}
                        onClick={() =>
                          start(async () => {
                            const r = await deleteOrder(order.id)
                            if (!r.ok) setFailed(r.error ?? 'No se pudo borrar el pedido.')
                          })
                        }
                      >
                        {pending ? 'Borrando…' : 'Borrar definitivamente'}
                      </button>
                    </div>
                    {failed ? (
                      <p className="a-note a-note--error mt-2" role="alert">
                        {failed}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="a-hint mt-2">
                      Para los registros que no fueron una venta. No tiene vuelta atrás.
                    </p>
                    <button
                      type="button"
                      className="a-btn a-btn--sm mt-2"
                      onClick={() => setConfirming(true)}
                    >
                      Borrar pedido
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  )
}

export function OrderList({ orders, canDelete = false }: { orders: OrderWithItems[]; canDelete?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos')
  const [pending, start] = useTransition()

  const visibles = useMemo(
    () => (filter === 'todos' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  )

  if (orders.length === 0) {
    return (
      <p className="a-hint mt-6">
        Todavía no entró ningún pedido. En cuanto alguien cierre una compra desde el checkout,
        aparece acá.
      </p>
    )
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`a-btn a-btn--sm ${filter === 'todos' ? 'a-btn--solid' : ''}`}
          onClick={() => setFilter('todos')}
        >
          Todos ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => {
          const n = orders.filter((o) => o.status === s).length
          if (n === 0) return null
          return (
            <button
              key={s}
              type="button"
              className={`a-btn a-btn--sm ${filter === s ? 'a-btn--solid' : ''}`}
              onClick={() => setFilter(s)}
            >
              {ETIQUETA[s]} ({n})
            </button>
          )
        })}
      </div>

      <div className="a-panel a-scroll mt-4">
        <table className="a-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Zona</th>
              <th>Total</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((o) => (
              // Fragmento con clave: la fila y su detalle son dos `<tr>` que
              // pertenecen al mismo pedido. `<>` no acepta clave.
              <Fragment key={o.id}>
                <tr>
                  <td className="a-num text-fg">{o.number}</td>
                  <td className="a-num text-fg-low">
                    {new Date(o.created_at).toLocaleDateString('es-PY')}
                  </td>
                  <td>
                    {o.first_name} {o.last_name}
                    <span className="a-num block text-[0.75rem] text-fg-low">{o.phone}</span>
                  </td>
                  <td className="text-[0.8125rem] text-fg-mid">{o.zone_name}</td>
                  <td className="a-num">{gs(Number(o.total_pyg))}</td>
                  <td>
                    <label className="sr-only" htmlFor={`estado-${o.id}`}>
                      Estado del pedido {o.number}
                    </label>
                    <select
                      id={`estado-${o.id}`}
                      className="a-field"
                      style={{ minHeight: '36px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      value={o.status}
                      disabled={pending}
                      onChange={(e) =>
                        start(
                          async () =>
                            void (await setOrderStatus(o.id, e.target.value as OrderStatus)),
                        )
                      }
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ETIQUETA[s]}
                        </option>
                      ))}
                    </select>
                    <span className={`a-tag mt-1 ${TONO[o.status]}`}>{ETIQUETA[o.status]}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="a-btn a-btn--sm"
                      aria-expanded={open === o.id}
                      onClick={() => setOpen(open === o.id ? null : o.id)}
                    >
                      {open === o.id ? 'Cerrar' : 'Ver'}
                    </button>
                  </td>
                </tr>
                {open === o.id ? <OrderDetail order={o} canDelete={canDelete} /> : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

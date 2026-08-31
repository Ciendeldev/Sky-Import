import Link from 'next/link'
import { listOrders, listProducts, listStockAlerts, getSettings } from '@/lib/admin/queries'
import { ImportCatalogButton } from '@/components/admin/ImportCatalogButton'
import { pyg } from '@/lib/whatsapp'

export const metadata = { title: 'Tablero · Panel Sky Import' }

/** El panel siempre muestra el estado de ahora, nunca una copia en caché. */
export const dynamic = 'force-dynamic'

export default async function TableroPage() {
  const [productos, pedidos, alertas, { fx }] = await Promise.all([
    listProducts(),
    listOrders(50),
    listStockAlerts(),
    getSettings(),
  ])

  const nuevos = pedidos.filter((p) => p.status === 'iniciado_whatsapp')
  const vendidoUsd = pedidos
    .filter((p) => p.status !== 'cancelado')
    .reduce((sum, p) => sum + Number(p.total_usd), 0)

  const agotados = alertas.filter((a) => a.level === 'agotado').length

  return (
    <>
      <p className="a-eyebrow">Sky Import</p>
      <h1 className="a-title mt-2">Tablero</h1>

      {productos.length === 0 ? (
        <div className="a-note a-note--warn mt-8">
          <p className="font-medium">La base todavía no tiene productos.</p>
          <p className="mt-2 leading-relaxed">
            El catálogo tipado del proyecto tiene 37 piezas con su ficha técnica y sus datos de
            compatibilidad. Se importan de una vez y después se editan desde acá.
          </p>
          <div className="mt-4">
            <ImportCatalogButton />
          </div>
        </div>
      ) : null}

      <div className="a-grid a-grid--3 mt-8">
        <div className="a-stat">
          <p className="a-eyebrow">Pedidos por atender</p>
          <p className="a-stat__value" style={{ color: nuevos.length > 0 ? 'var(--accent)' : undefined }}>
            {nuevos.length}
          </p>
          <p className="a-hint">De {pedidos.length} registrados</p>
        </div>

        <div className="a-stat">
          <p className="a-eyebrow">Piezas en catálogo</p>
          <p className="a-stat__value">{productos.length}</p>
          <p className="a-hint">
            {productos.filter((p) => p.active).length} publicadas
          </p>
        </div>

        <div className="a-stat">
          <p className="a-eyebrow">Alertas de stock</p>
          <p
            className="a-stat__value"
            style={{
              color:
                agotados > 0
                  ? 'var(--color-rust)'
                  : alertas.length > 0
                    ? 'var(--color-amber)'
                    : undefined,
            }}
          >
            {alertas.length}
          </p>
          <p className="a-hint">{agotados} agotadas</p>
        </div>
      </div>

      <div className="a-grid a-grid--2 mt-4">
        <div className="a-stat">
          <p className="a-eyebrow">Vendido — pedidos no cancelados</p>
          <p className="a-stat__value">Gs. {pyg(vendidoUsd)}</p>
          <p className="a-hint">US$ {vendidoUsd.toFixed(2)} a la tasa de {fx.PYG} Gs./US$</p>
        </div>

        <div className="a-stat">
          <p className="a-eyebrow">Tasa vigente</p>
          <p className="a-stat__value">{fx.PYG.toLocaleString('es-PY')}</p>
          <p className="a-hint">
            Guaraníes por dólar · referencia {fx.reference} ·{' '}
            <Link href="/admin/precios" className="text-accent underline">
              cambiar
            </Link>
          </p>
        </div>
      </div>

      {/* ── lo que hay que mirar hoy ── */}
      {alertas.length > 0 ? (
        <section className="mt-10">
          <h2 className="a-eyebrow">Stock que necesita atención</h2>
          <div className="a-panel a-scroll mt-3">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Pieza</th>
                  <th>Código</th>
                  <th>Unidades</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alertas.slice(0, 12).map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="a-num text-fg-low">{a.ref}</td>
                    <td className="a-num">{a.units}</td>
                    <td>
                      <span className={`a-tag ${a.level === 'agotado' ? 'a-tag--stop' : 'a-tag--warn'}`}>
                        {a.level === 'agotado' ? 'Agotado' : 'Últimas unidades'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {alertas.length > 12 ? (
            <p className="a-hint mt-2">
              Y {alertas.length - 12} más.{' '}
              <Link href="/admin/productos" className="text-accent underline">
                Ver todo el inventario
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── últimos pedidos ── */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="a-eyebrow">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="a-btn a-btn--sm">
            Ver todos
          </Link>
        </div>

        {pedidos.length === 0 ? (
          <p className="a-hint mt-3">
            Todavía no entró ningún pedido. Cuando alguien cierre una compra por WhatsApp, queda
            registrado acá con estado «Iniciado por WhatsApp».
          </p>
        ) : (
          <div className="a-panel a-scroll mt-3">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td className="a-num">{p.number}</td>
                    <td>
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="a-num">Gs. {pyg(Number(p.total_usd))}</td>
                    <td>
                      <span
                        className={`a-tag ${
                          p.status === 'iniciado_whatsapp'
                            ? 'a-tag--info'
                            : p.status === 'cancelado'
                              ? 'a-tag--stop'
                              : 'a-tag--ok'
                        }`}
                      >
                        {p.status === 'iniciado_whatsapp' ? 'Iniciado por WhatsApp' : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

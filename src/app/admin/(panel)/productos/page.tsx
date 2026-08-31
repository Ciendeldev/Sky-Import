import Link from 'next/link'
import { getSettings, listProducts, stockLevelOf } from '@/lib/admin/queries'
import { ImportCatalogButton } from '@/components/admin/ImportCatalogButton'
import { StockCell } from '@/components/admin/StockCell'
import { pyg } from '@/lib/whatsapp'

export const metadata = { title: 'Productos · Panel Sky Import' }
export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  const [productos, { rules }] = await Promise.all([listProducts(), getSettings()])

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="a-eyebrow">Inventario</p>
          <h1 className="a-title mt-2">Productos</h1>
        </div>
        <Link href="/admin/productos/nuevo" className="a-btn a-btn--solid">
          Nueva pieza
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className="a-note a-note--warn mt-8">
          <p className="font-medium">La base todavía no tiene productos.</p>
          <p className="mt-2 leading-relaxed">
            Importá el catálogo tipado del proyecto para empezar con las 37 piezas y sus fichas
            técnicas cargadas.
          </p>
          <div className="mt-4">
            <ImportCatalogButton />
          </div>
        </div>
      ) : (
        <>
          <p className="a-hint mt-4">
            {productos.length} piezas · el stock se edita acá mismo, sin abrir la ficha. El aviso de
            últimas unidades salta a las {rules.lowStockAt} o menos, salvo que la pieza tenga su
            propio umbral.
          </p>

          <div className="a-panel a-scroll mt-5">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Pieza</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Variantes</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const variantes = p.product_variants ?? []
                  // Con variantes activas, el stock real es la suma de ellas:
                  // el número del producto base deja de mandar.
                  const stock = variantes.length
                    ? variantes.filter((v) => v.active).reduce((s, v) => s + v.units, 0)
                    : p.units
                  const nivel = stockLevelOf(stock, p.min_stock, rules.lowStockAt)

                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/productos/${p.id}`} className="text-fg hover:text-accent">
                          {p.name}
                        </Link>
                        <span className="block text-[0.75rem] text-fg-low">{p.brand}</span>
                      </td>
                      <td className="a-num text-fg-low">{p.ref}</td>
                      <td className="text-[0.8125rem] text-fg-mid">{p.category_slug}</td>
                      <td className="a-num">
                        Gs. {pyg(Number(p.price_usd))}
                        <span className="block text-[0.6875rem] text-fg-low">
                          US$ {Number(p.price_usd).toFixed(0)}
                        </span>
                      </td>
                      <td>
                        {variantes.length ? (
                          <span className="a-num text-fg-mid" title="Suma de las variantes activas">
                            {stock}
                          </span>
                        ) : (
                          <StockCell id={p.id} units={p.units} />
                        )}
                      </td>
                      <td className="a-num text-fg-low">{variantes.length || '—'}</td>
                      <td>
                        <span
                          className={`a-tag ${
                            !p.active
                              ? 'a-tag--ok'
                              : nivel === 'agotado'
                                ? 'a-tag--stop'
                                : nivel === 'bajo'
                                  ? 'a-tag--warn'
                                  : 'a-tag--ok'
                          }`}
                        >
                          {!p.active
                            ? 'Oculta'
                            : nivel === 'agotado'
                              ? 'Agotado'
                              : nivel === 'bajo'
                                ? 'Últimas'
                                : 'Disponible'}
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/productos/${p.id}`} className="a-btn a-btn--sm">
                          Editar
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

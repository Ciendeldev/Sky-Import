'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProduct, saveProduct, type ActionResult } from '@/lib/admin/actions'
import type { CategoryRow, ProductRow } from '@/lib/supabase/types'

/**
 * Alta y edición de una pieza.
 *
 * Lo que NO está acá y es deliberado: la ficha técnica (`specs`) y los datos de
 * compatibilidad (`compat`) del catálogo importado. Son estructuras tipadas que
 * alimentan el configurador, y un formulario de texto libre las rompería sin
 * que nadie se entere hasta que un cliente arme una máquina imposible. Se
 * editan en `src/lib/catalog/products.ts` y se reimportan.
 */
export function ProductForm({
  product,
  categories,
}: {
  product?: ProductRow
  categories: CategoryRow[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <form
      className="mt-8"
      action={(formData) =>
        start(async () => {
          const res = await saveProduct(formData)
          setResult(res)
          if (res.ok && !product) router.push('/admin/productos')
        })
      }
    >
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <section className="a-panel a-panel--pad">
        <h2 className="a-eyebrow">Identidad</h2>

        <div className="a-grid a-grid--2 mt-4">
          <div>
            <label className="a-label" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              className="a-field"
              defaultValue={product?.name}
              required
            />
          </div>

          <div>
            <label className="a-label" htmlFor="ref">
              Código de referencia
            </label>
            <input
              id="ref"
              name="ref"
              className="a-field a-num"
              defaultValue={product?.ref}
              placeholder="SI-VGA-0112"
              required
            />
            <p className="a-hint">Es el que se dicta por teléfono y viaja en el mensaje de WhatsApp.</p>
          </div>

          <div>
            <label className="a-label" htmlFor="brand">
              Marca
            </label>
            <input id="brand" name="brand" className="a-field" defaultValue={product?.brand} />
          </div>

          <div>
            <label className="a-label" htmlFor="model">
              Modelo
            </label>
            <input id="model" name="model" className="a-field" defaultValue={product?.model} />
          </div>

          <div>
            <label className="a-label" htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              className="a-field a-num"
              defaultValue={product?.slug}
              pattern="[a-z0-9\-]+"
              required
            />
            <p className="a-hint">
              Es la dirección de la ficha. Cambiarlo rompe los enlaces ya compartidos.
            </p>
          </div>

          <div>
            <label className="a-label" htmlFor="category_slug">
              Categoría
            </label>
            <select
              id="category_slug"
              name="category_slug"
              className="a-field"
              defaultValue={product?.category_slug ?? categories[0]?.slug}
              required
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name_es}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="a-panel a-panel--pad mt-4">
        <h2 className="a-eyebrow">Precio y stock</h2>

        <div className="a-grid a-grid--2 mt-4">
          <div>
            <label className="a-label" htmlFor="price_usd">
              Precio en dólares
            </label>
            <input
              id="price_usd"
              name="price_usd"
              type="number"
              step="0.01"
              min="0"
              className="a-field a-num"
              defaultValue={product?.price_usd}
              required
            />
            <p className="a-hint">
              El dólar es la fuente. Guaraníes y reales se derivan de la tasa vigente.
            </p>
          </div>

          <div>
            <label className="a-label" htmlFor="list_price_usd">
              Precio anterior
            </label>
            <input
              id="list_price_usd"
              name="list_price_usd"
              type="number"
              step="0.01"
              min="0"
              className="a-field a-num"
              defaultValue={product?.list_price_usd ?? ''}
            />
            <p className="a-hint">
              Si es mayor que el actual, la tienda calcula y muestra el porcentaje sola. Vacío = sin
              oferta.
            </p>
          </div>

          <div>
            <label className="a-label" htmlFor="units">
              Unidades
            </label>
            <input
              id="units"
              name="units"
              type="number"
              step="1"
              min="0"
              className="a-field a-num"
              defaultValue={product?.units ?? 0}
            />
            <p className="a-hint">0 deja la pieza como agotada. No hay un campo «agotado» aparte.</p>
          </div>

          <div>
            <label className="a-label" htmlFor="min_stock">
              Umbral de aviso
            </label>
            <input
              id="min_stock"
              name="min_stock"
              type="number"
              step="1"
              min="0"
              className="a-field a-num"
              defaultValue={product?.min_stock ?? ''}
              placeholder="usa el global"
            />
            <p className="a-hint">
              Vacío = el umbral general del panel. Útil para piezas que se venden de a muchas.
            </p>
          </div>
        </div>
      </section>

      <section className="a-panel a-panel--pad mt-4">
        <h2 className="a-eyebrow">Descripción</h2>

        <div className="a-grid a-grid--2 mt-4">
          <div>
            <label className="a-label" htmlFor="blurb_es">
              Español
            </label>
            <textarea
              id="blurb_es"
              name="blurb_es"
              className="a-field"
              defaultValue={product?.blurb_es}
            />
          </div>

          <div>
            <label className="a-label" htmlFor="blurb_pt">
              Portugués
            </label>
            <textarea
              id="blurb_pt"
              name="blurb_pt"
              className="a-field"
              defaultValue={product?.blurb_pt}
            />
            <p className="a-hint">
              La tienda es bilingüe: si esto queda vacío, un cliente brasileño ve el hueco.
            </p>
          </div>
        </div>
      </section>

      <section className="a-panel a-panel--pad mt-4">
        <h2 className="a-eyebrow">Publicación</h2>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2.5 text-[0.875rem] text-fg-mid">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product?.active ?? true}
              className="size-4 accent-[var(--accent)]"
            />
            Visible en la tienda
          </label>

          <label className="flex items-center gap-2.5 text-[0.875rem] text-fg-mid">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={product?.featured ?? false}
              className="size-4 accent-[var(--accent)]"
            />
            Destacada en la portada
          </label>

          <label className="flex items-center gap-2.5 text-[0.875rem] text-fg-mid">
            <input
              type="checkbox"
              name="arrived_recently"
              defaultChecked={product?.arrived_recently ?? false}
              className="size-4 accent-[var(--accent)]"
            />
            Llegada reciente
          </label>
        </div>
      </section>

      {result ? (
        <p className={`a-note mt-5 ${result.ok ? 'a-note--ok' : 'a-note--error'}`} role="status">
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className="a-btn a-btn--solid" disabled={pending}>
          {pending ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear pieza'}
        </button>

        {product ? (
          confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-[0.8125rem] text-amber">¿Eliminar {product.name}?</span>
              <button
                type="button"
                className="a-btn a-btn--sm a-btn--danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteProduct(product.id)
                    if (res.ok) router.push('/admin/productos')
                    else setResult(res)
                  })
                }
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                className="a-btn a-btn--sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="a-btn a-btn--danger"
              onClick={() => setConfirmDelete(true)}
            >
              Eliminar
            </button>
          )
        ) : null}
      </div>
    </form>
  )
}

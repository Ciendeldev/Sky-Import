'use client'

import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ProductCard } from '@/components/catalog/ProductCard'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { useI18n } from '@/lib/i18n/context'
import { useCatalog } from '@/lib/catalog/context'
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/catalog/categories'
import { availabilityOf } from '@/lib/catalog/types'
import { matchRank } from '@/lib/search'
import { formatMoney } from '@/lib/money'

/**
 * El estado de los filtros vive en la URL para que una búsqueda se pueda
 * compartir y para que atrás/adelante funcionen. Los valores por defecto se
 * BORRAN de la URL en lugar de escribirse, así que `/catalogo` queda limpio.
 *
 * El filtrado es local: con este tamaño de catálogo, ir al servidor por cada
 * tecla sería más lento y menos fiable que filtrar en memoria.
 */

const SORTS = ['relevance', 'priceAsc', 'priceDesc', 'name'] as const
type Sort = (typeof SORTS)[number]

function isSort(value: string | null): value is Sort {
  return value !== null && (SORTS as readonly string[]).includes(value)
}

export function CatalogBrowser() {
  const { t, locale, l } = useI18n()
  const { products, brands, priceBounds, fx, lowStockAt } = useCatalog()
  const pathname = usePathname()
  const params = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const closeSheet = useCallback(() => setSheetOpen(false), [])
  useFocusTrap(sheetRef, sheetOpen, closeSheet)

  const query = params.get('q') ?? ''
  const category = params.get('categoria') ?? ''
  const brand = params.get('marca') ?? ''
  const maxPrice = Number(params.get('max') ?? priceBounds.max)
  const onlyStock = params.get('stock') === '1'
  const sortParam = params.get('orden')
  const sort: Sort = isSort(sortParam) ? sortParam : 'relevance'

  const deferredQuery = useDeferredValue(query)

  /**
   * El estado de los filtros se escribe con la History API nativa, no con
   * `router.replace`. Dos motivos, uno de corrección y otro de velocidad:
   *
   *   · `router.replace` hacia la MISMA ruta estática se anula a sí mismo. Al
   *     entrar en `/catalogo?q=algo` y cambiar el texto, la URL no se movía y el
   *     campo volvía al valor anterior: el buscador quedaba muerto.
   *   · `pushState`/`replaceState` están integrados con el enrutador de Next y
   *     `useSearchParams` se sincroniza con ellos, así que no hace falta un
   *     viaje al servidor por cada tecla.
   *
   * Se parte de `window.location.search` y no del valor del hook para no
   * arrastrar un estado viejo entre pulsaciones seguidas.
   */
  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      const search = next.toString()
      window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname)
    },
    [pathname],
  )

  const reset = useCallback(() => {
    window.history.replaceState(null, '', pathname)
  }, [pathname])

  const results = useMemo(() => {
    const scored = products.flatMap((product) => {
      if (category && product.category !== category) return []
      if (brand && product.brand !== brand) return []
      if (product.priceUsd > maxPrice) return []
      if (onlyStock && product.units <= 0) return []

      const rank = matchRank(deferredQuery, {
        primary: [product.name, product.model, product.brand, product.ref],
        secondary: [
          product.blurb[locale],
          CATEGORY_META[product.category].name[locale],
          ...product.specs.map((s) => (typeof s.value === 'string' ? s.value : s.value[locale])),
        ],
      })
      if (rank === null) return []
      return [{ product, rank }]
    })

    switch (sort) {
      case 'priceAsc':
        scored.sort((a, b) => a.product.priceUsd - b.product.priceUsd)
        break
      case 'priceDesc':
        scored.sort((a, b) => b.product.priceUsd - a.product.priceUsd)
        break
      case 'name':
        scored.sort((a, b) => a.product.name.localeCompare(b.product.name, locale))
        break
      default:
        scored.sort(
          (a, b) =>
            a.rank - b.rank ||
            Number(b.product.featured ?? false) - Number(a.product.featured ?? false) ||
            CATEGORY_ORDER.indexOf(a.product.category) - CATEGORY_ORDER.indexOf(b.product.category) ||
            b.product.priceUsd - a.product.priceUsd,
        )
    }

    return scored.map((entry) => entry.product)
  }, [brand, category, deferredQuery, locale, maxPrice, onlyStock, products, sort])

  const activeCount =
    (query ? 1 : 0) + (category ? 1 : 0) + (brand ? 1 : 0) + (onlyStock ? 1 : 0) +
    (maxPrice < priceBounds.max ? 1 : 0)

  const sortControl = (
    <>
      <label htmlFor="orden" className="sr-only">
        {t('catalog.sort')}
      </label>
      <select
        id="orden"
        value={sort}
        onChange={(event) =>
          update({ orden: event.target.value === 'relevance' ? null : event.target.value })
        }
        className="u-field min-w-[168px] cursor-pointer py-2.5"
      >
        {SORTS.map((option) => (
          <option key={option} value={option}>
            {t(`catalog.sort.${option}`)}
          </option>
        ))}
      </select>
    </>
  )

  const filters = (
    <div className="flex flex-col gap-8">
      {/* En teléfono el orden vive dentro de la hoja: dos controles anchos en la
          misma fila no entran en 360 px sin comprimir el objetivo táctil. */}
      <fieldset className="lg:hidden">
        <legend className="u-label mb-3 text-fg">{t('catalog.sort')}</legend>
        {sortControl}
      </fieldset>

      <fieldset>
        <legend className="u-label mb-3 text-fg">{t('catalog.category')}</legend>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => update({ categoria: null })}
            aria-pressed={category === ''}
            className="flex items-center justify-between border-b border-rule py-2.5 text-left text-[0.875rem] text-fg-mid transition-colors hover:text-fg aria-pressed:text-fg"
          >
            {t('catalog.all')}
            <span className="font-mono text-[0.625rem] tabular-nums text-fg-low">
              {products.length}
            </span>
          </button>
          {CATEGORY_ORDER.map((slug) => {
            const count = products.filter((product) => product.category === slug).length
            return (
              <button
                key={slug}
                type="button"
                onClick={() => update({ categoria: category === slug ? null : slug })}
                aria-pressed={category === slug}
                className="flex items-center justify-between border-b border-rule py-2.5 text-left text-[0.875rem] text-fg-mid transition-colors hover:text-fg aria-pressed:text-fg"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-px w-3 bg-accent transition-opacity"
                    style={{ opacity: category === slug ? 1 : 0 }}
                    aria-hidden="true"
                  />
                  {CATEGORY_META[slug].name[locale]}
                </span>
                <span className="font-mono text-[0.625rem] tabular-nums text-fg-low">{count}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="u-label mb-3 text-fg">{t('catalog.brand')}</legend>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => update({ marca: null })}
            aria-pressed={brand === ''}
            className="u-tag min-h-[36px] border-rule px-2.5 text-fg-low transition-colors hover:text-fg aria-pressed:border-fg aria-pressed:text-fg"
          >
            {t('catalog.all')}
          </button>
          {brands.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => update({ marca: brand === name ? null : name })}
              aria-pressed={brand === name}
              className="u-tag min-h-[36px] border-rule px-2.5 text-fg-low transition-colors hover:text-fg aria-pressed:border-fg aria-pressed:text-fg"
            >
              {name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="u-label mb-3 text-fg">
          {t('catalog.price')} — {formatMoney(maxPrice, 'USD', fx)}
        </legend>
        <input
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          step={10}
          value={maxPrice}
          onChange={(event) =>
            update({
              max:
                Number(event.target.value) >= priceBounds.max ? null : event.target.value,
            })
          }
          className="w-full accent-[var(--accent)]"
          aria-label={t('catalog.price')}
        />
        <div className="mt-1 flex justify-between font-mono text-[0.625rem] tabular-nums text-fg-low">
          <span>{formatMoney(priceBounds.min, 'USD', fx)}</span>
          <span>{formatMoney(priceBounds.max, 'USD', fx)}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="u-label mb-3 text-fg">{t('catalog.availability')}</legend>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[0.875rem] text-fg-mid">
          <input
            type="checkbox"
            checked={onlyStock}
            onChange={(event) => update({ stock: event.target.checked ? '1' : null })}
            className="peer sr-only"
          />
          <span
            className="grid size-5 shrink-0 place-items-center border border-rule rounded-hair transition-colors peer-checked:border-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]"
            aria-hidden="true"
          >
            <span
              className="h-2.5 w-2.5 bg-accent transition-transform"
              style={{ transform: onlyStock ? 'scale(1)' : 'scale(0)' }}
            />
          </span>
          {t('catalog.onlyAvailable')}
        </label>
      </fieldset>

      {activeCount > 0 ? (
        <button type="button" onClick={reset} className="u-btn u-btn-line">
          {t('catalog.reset')}
        </button>
      ) : null}
    </div>
  )

  return (
    <div className="u-page grid gap-10 pb-24 lg:grid-cols-12 lg:gap-10">
      {/* ── panel de filtros: columna en escritorio ── */}
      <aside className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-28">{filters}</div>
      </aside>

      <div className="lg:col-span-9">
        <div className="flex flex-col gap-4 border-b border-rule pb-5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="buscar" className="sr-only">
              {t('catalog.searchLabel')}
            </label>
            <input
              id="buscar"
              type="search"
              value={query}
              onChange={(event) => update({ q: event.target.value || null })}
              placeholder={t('catalog.search')}
              className="u-field pl-10"
              data-cursor="text"
            />
            <svg
              viewBox="0 0 18 18"
              width="15"
              height="15"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-low"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="7.6" cy="7.6" r="5.2" />
              <path d="M11.5 11.5 L15.6 15.6" />
            </svg>
          </div>

          <div className="hidden items-center gap-2 lg:flex">{sortControl}</div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="u-btn u-btn-line w-full sm:w-auto lg:hidden"
            aria-haspopup="dialog"
          >
            {t('catalog.openFilters')}
            {activeCount > 0 ? (
              <span className="font-mono text-[0.625rem] tabular-nums text-accent">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        <p className="u-label mt-4" role="status" aria-live="polite">
          {results.length} {results.length === 1 ? t('catalog.result') : t('catalog.results')}
        </p>

        {results.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border-t border-rule py-20">
            <p className="u-display-sm text-2xl">{t('catalog.empty.title')}</p>
            <p className="u-measure text-[0.9375rem] text-fg-mid">{t('catalog.empty.body')}</p>
            <button type="button" onClick={reset} className="u-btn u-btn-line mt-2">
              {t('catalog.reset')}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-x-6 gap-y-12 border-b border-rule pb-12 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((product, i) => (
              <ProductCard key={product.slug} product={product} index={i} />
            ))}
          </div>
        )}

        {/* Nota honesta sobre lo que significa cada estado. */}
        <p className="u-label mt-6 leading-relaxed normal-case tracking-normal">
          {l({
            es: `«${t('product.availability.ultimas-unidades')}» significa ${lowStockAt} unidades o menos según nuestra configuración de inventario. ${t('product.priceNote')}`,
            pt: `«${t('product.availability.ultimas-unidades')}» significa ${lowStockAt} unidades ou menos conforme nossa configuração de estoque. ${t('product.priceNote')}`,
          })}
        </p>
      </div>

      {/* ── panel de filtros: hoja inferior en teléfono ── */}
      {sheetOpen ? (
        <>
          <div
            className="fixed inset-0 z-[60] bg-carbon-sunk/70 lg:hidden"
            onClick={closeSheet}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('catalog.filters')}
            className="fixed inset-x-0 bottom-0 z-[65] flex max-h-[86vh] flex-col bg-surface-lift shadow-lift lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 className="u-label text-fg">{t('catalog.filters')}</h2>
              <button
                type="button"
                onClick={closeSheet}
                aria-label={t('cta.close')}
                className="grid size-11 place-items-center text-fg-mid"
              >
                <svg viewBox="0 0 14 14" width="12" height="12" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">{filters}</div>
            <div className="border-t border-rule px-5 py-4">
              <button type="button" onClick={closeSheet} className="u-btn u-btn-solid w-full">
                {t('catalog.applyFilters')} ({results.length})
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** Estado derivado que la ficha usa para su etiqueta; se exporta para las pruebas. */
export { availabilityOf }

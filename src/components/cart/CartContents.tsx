'use client'

import Link from 'next/link'
import { ComponentRender } from '@/components/render/ComponentRender'
import { Price } from '@/components/ui/Price'
import { useCart, resolveLines, totalsOf, lineKey } from '@/lib/cart'
import { useUi } from '@/lib/ui'
import { useI18n } from '@/lib/i18n/context'
import { formatMoney } from '@/lib/money'
import { RULES } from '@/config/site'

function Stepper({
  qty,
  max,
  onChange,
}: {
  qty: number
  max: number
  onChange: (next: number) => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex items-center border border-rule rounded-part">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        aria-label={t('product.decrease')}
        data-cursor="link"
        className="grid size-11 place-items-center text-fg-mid transition-colors hover:text-fg"
      >
        <svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      </button>
      <span
        className="w-8 text-center font-mono text-[0.8125rem] tabular-nums"
        aria-live="polite"
        data-testid="cantidad"
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= max}
        aria-label={t('product.increase')}
        data-cursor="link"
        className="grid size-11 place-items-center text-fg-mid transition-colors hover:text-fg disabled:opacity-35"
      >
        <svg viewBox="0 0 12 12" width="11" height="11" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <line x1="2" y1="6" x2="10" y2="6" />
          <line x1="6" y1="2" x2="6" y2="10" />
        </svg>
      </button>
    </div>
  )
}

export function CartContents({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void
  compact?: boolean
}) {
  const { t, path, locale } = useI18n()
  const lines = useCart((s) => s.lines)
  const hydrated = useCart((s) => s.hydrated)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const undoRemove = useCart((s) => s.undoRemove)
  const clear = useCart((s) => s.clear)
  const toast = useUi((s) => s.toast)

  const resolved = resolveLines(lines)
  const totals = totalsOf(resolved)

  // Compuerta de hidratación: primero un marcador neutro, nunca un «flash de vacío».
  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <p className="u-label">{t('cart.loading')}…</p>
      </div>
    )
  }

  if (resolved.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
        <p className="u-display-sm text-2xl">{t('cart.empty.title')}</p>
        <p className="u-measure text-[0.9375rem] text-fg-mid">{t('cart.empty.body')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={path('/catalogo')} onClick={onNavigate} className="u-btn u-btn-solid">
            {t('cta.catalog')}
          </Link>
          <Link href={path('/armar')} onClick={onNavigate} className="u-btn u-btn-line">
            {t('cta.build')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <ul className="flex-1 overflow-y-auto overscroll-contain">
        {resolved.map((line) => (
          <li key={lineKey(line)} className="border-b border-rule">
            <div className="flex gap-4 px-5 py-5">
              <Link
                href={path(`/producto/${line.slug}`)}
                onClick={onNavigate}
                data-cursor="product"
                data-cursor-label={t('cta.view')}
                className="block w-20 shrink-0 self-start bg-surface-sunk rounded-part"
              >
                <ComponentRender {...line.product.render} className="w-full" />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="u-label mb-1">{line.product.brand}</p>
                <Link
                  href={path(`/producto/${line.slug}`)}
                  onClick={onNavigate}
                  data-cursor="link"
                  className="u-link block text-[0.9375rem] font-medium leading-snug"
                >
                  {line.product.name}
                </Link>
                {line.variant ? (
                  <p className="mt-1 text-[0.8125rem] text-fg-mid">{line.variant.label[locale]}</p>
                ) : null}
                <p className="u-label mt-1 tabular-nums">
                  {line.variant?.sku ?? line.product.ref}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <Stepper qty={line.qty} max={line.max} onChange={(next) => setQty(lineKey(line), next)} />
                  <Price usd={line.lineTotalUsd} className="font-mono text-[0.9375rem] font-medium" />
                </div>

                <button
                  type="button"
                  data-cursor="link"
                  onClick={() => {
                    remove(lineKey(line))
                    toast(`${line.product.name} ${t('cart.removed')}`, {
                      label: t('cta.undo'),
                      run: undoRemove,
                    })
                  }}
                  className="u-link u-tap mt-3 font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-low hover:text-fg"
                >
                  {t('cart.remove')}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-rule bg-surface px-5 py-5">
        {/* Medidor de envío bonificado: 1 px, sin relleno de color. */}
        {totals.toFreeShippingUsd > 0 ? (
          <div className="mb-4">
            <p className="u-label mb-2">
              {t('cart.shipping.toFree', { amount: formatMoney(totals.toFreeShippingUsd, 'USD') })}
            </p>
            <div className="h-px w-full bg-rule">
              <div
                className="h-px bg-accent transition-[width] duration-500 ease-rail"
                style={{
                  width: `${Math.min(100, Math.round((totals.subtotalUsd / RULES.freeShippingUsd) * 100))}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="u-label mb-4 text-accent">{t('cart.shipping.qualified')}</p>
        )}

        <dl>
          <div className="u-spec">
            <dt>{t('cart.subtotal')}</dt>
            <dd>
              <Price usd={totals.subtotalUsd} />
            </dd>
          </div>
          <div className="u-spec">
            <dt>{t('cart.shipping')}</dt>
            <dd>
              {totals.shippingUsd === 0 ? (
                t('cart.shipping.free')
              ) : (
                <Price usd={totals.shippingUsd} />
              )}
            </dd>
          </div>
          <div className="u-spec border-b-0">
            <dt className="text-fg">{t('cart.total')}</dt>
            <dd className="text-base font-medium">
              <Price usd={totals.totalUsd} />
            </dd>
          </div>
        </dl>

        <p className="u-label mt-3 leading-relaxed normal-case tracking-normal">
          {t('currency.note')}
        </p>

        <div className={`mt-5 grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
          <Link
            href={path('/checkout')}
            onClick={onNavigate}
            className="u-btn u-btn-solid w-full"
          >
            {t('cart.checkout')}
          </Link>
          <button
            type="button"
            onClick={() => {
              clear()
              toast(t('cart.cleared'))
            }}
            className="u-btn u-btn-line w-full"
          >
            {t('cart.clear')}
          </button>
        </div>

        <p className="mt-3 text-center">
          <Link
            href={path('/catalogo')}
            onClick={onNavigate}
            data-cursor="link"
            className="u-link u-tap font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-low"
          >
            {t('cart.continue')}
          </Link>
        </p>
      </div>

      {/* Resumen anunciable para lectores de pantalla. */}
      <p className="sr-only" role="status">
        {totals.count} {totals.count === 1 ? t('cart.line') : t('cart.lines')}
      </p>
    </>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ComponentRender } from '@/components/render/ComponentRender'
import { Price } from '@/components/ui/Price'
import { CtaBody } from '@/components/ui/Cta'
import { useCart, resolveLines, lineKey } from '@/lib/cart'
import { useI18n } from '@/lib/i18n/context'
import { hasWhatsapp } from '@/config/site'
import { orderMessage, whatsappUrl } from '@/lib/whatsapp'
import {
  FALLBACK_ZONES,
  checkCoupon,
  fetchZones,
  placeOrder,
  shippingFor,
  type Zone,
} from '@/lib/checkout'
import type { DictKey } from '@/lib/i18n/dictionary'

/**
 * FINALIZAR COMPRA
 *
 * Una sola pantalla, tres bloques y un botón. Sin pasos, sin pasarela y sin
 * selector de métodos de pago: el único cierre de venta de esta tienda es el
 * mensaje de WhatsApp, así que la pantalla existe para reunir lo que ese
 * mensaje necesita y nada más.
 *
 * Qué pasa al enviar, en orden:
 *
 *   1. Se registra el pedido en la base. La base relee los precios, aplica el
 *      cupón, descuenta el stock y devuelve un número. El cliente nunca decide
 *      el total.
 *   2. Se arma el mensaje con ese número y se abre la conversación.
 *   3. El carrito se vacía.
 *
 * Si el paso 1 no está disponible —todavía no hay base conectada—, la venta
 * sigue igual por WhatsApp: se pierde el registro interno, no la venta.
 */
export function CheckoutFlow() {
  const { t, locale, path } = useI18n()
  const lines = useCart((s) => s.lines)
  const hydrated = useCart((s) => s.hydrated)
  const clear = useCart((s) => s.clear)

  const [zones, setZones] = useState<Zone[]>(FALLBACK_ZONES)
  const [zoneSlug, setZoneSlug] = useState<string>(FALLBACK_ZONES[0]!.slug)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; discountUsd: number } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Las zonas de la base pisan a las de arranque en cuanto llegan.
  useEffect(() => {
    let vivo = true
    fetchZones().then((z) => {
      if (!vivo || z.length === 0) return
      setZones(z)
      setZoneSlug((actual) => (z.some((x) => x.slug === actual) ? actual : z[0]!.slug))
    })
    return () => {
      vivo = false
    }
  }, [])

  const resolved = resolveLines(lines)
  const subtotalUsd = resolved.reduce((sum, l) => sum + l.lineTotalUsd, 0)
  const zone = useMemo(() => zones.find((z) => z.slug === zoneSlug) ?? null, [zones, zoneSlug])

  const discountUsd = coupon ? Math.min(coupon.discountUsd, subtotalUsd) : 0
  const netUsd = subtotalUsd - discountUsd
  const shippingUsd = shippingFor(zone, netUsd)
  const totalUsd = netUsd + shippingUsd

  if (!hydrated) {
    return (
      <div className="u-page py-24">
        <p className="u-label">{t('cart.loading')}…</p>
      </div>
    )
  }

  if (resolved.length === 0) {
    return (
      <div className="u-page flex flex-col items-start gap-5 py-24">
        <h2 className="u-display-sm text-2xl">{t('checkout.emptyTitle')}</h2>
        <p className="u-measure text-[0.9375rem] text-fg-mid">{t('checkout.emptyBody')}</p>
        <Link href={path('/catalogo')} className="u-btn u-btn-solid">
          {t('cta.catalog')}
        </Link>
      </div>
    )
  }

  async function aplicarCupon() {
    setCheckingCoupon(true)
    setCouponError(null)
    const res = await checkCoupon(couponInput, subtotalUsd)
    setCheckingCoupon(false)
    if (res.ok) {
      setCoupon({ code: res.code, discountUsd: res.discountUsd })
      setCouponInput('')
    } else {
      setCoupon(null)
      setCouponError(t(`checkout.coupon.${res.reason}` as DictKey))
    }
  }

  async function enviar() {
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError(t('checkout.required'))
      return
    }
    if (zone?.requiresAddress && !address.trim()) {
      setError(t('checkout.addressRequired'))
      return
    }

    setSending(true)

    // Se registra ANTES de abrir la conversación: así queda constancia del
    // pedido aunque el cliente no llegue a mandar el mensaje.
    const outcome = await placeOrder({
      items: resolved.map((l) => ({
        slug: l.slug,
        variant_sku: l.variantSku ?? null,
        qty: l.qty,
      })),
      customer: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        locale,
      },
      zoneSlug,
      couponCode: coupon?.code ?? null,
    })

    // Falta de stock es lo único que detiene la venta: mandar por WhatsApp un
    // pedido que no se puede cumplir es peor que pararlo acá.
    if (outcome.status === 'bloqueado') {
      setSending(false)
      setError(outcome.message)
      return
    }

    // Cualquier otro fallo del registro se anota en consola para el operador y
    // la venta sigue. El seguimiento interno no vale una venta perdida.
    if (outcome.status === 'sin-registro') {
      console.warn('[sky-import] el pedido no quedó registrado:', outcome.reason)
    }

    const orderNumber = outcome.status === 'registrado' ? outcome.number : null

    const mensaje = orderMessage({
      lines: resolved.map((l) => ({
        name: l.product.name,
        sku: l.variant?.sku ?? l.product.ref,
        qty: l.qty,
        subtotalUsd: l.lineTotalUsd,
        variantLabel: l.variant ? l.variant.label[locale] : undefined,
      })),
      subtotalUsd,
      discountUsd,
      couponCode: coupon?.code,
      shippingUsd,
      zoneName: zone ? zone.name[locale] : '',
      totalUsd,
      customer: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      },
      orderNumber: orderNumber ?? undefined,
    })

    // `window.open` desde el manejador del clic: si se hace después de un
    // `await` largo, el navegador lo trata como emergente y lo bloquea.
    window.open(whatsappUrl(mensaje), '_blank', 'noopener,noreferrer')
    clear()
    setSending(false)
  }

  const resumen = (
    <aside className="u-panel p-6 lg:sticky lg:top-28">
      <h2 className="u-label text-fg">{t('checkout.orderSummary')}</h2>

      <ul className="mt-4">
        {resolved.map((line) => (
          <li key={lineKey(line)} className="flex items-center gap-3 border-b border-rule py-3">
            <span className="w-12 shrink-0">
              <ComponentRender {...line.product.render} className="w-full" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] text-fg">{line.product.name}</span>
              {line.variant ? (
                <span className="block truncate text-[0.75rem] text-fg-mid">
                  {line.variant.label[locale]}
                </span>
              ) : null}
              <span className="u-label block tabular-nums">
                {line.qty} × {line.variant?.sku ?? line.product.ref}
              </span>
            </span>
            <Price usd={line.lineTotalUsd} className="shrink-0 font-mono text-[0.8125rem]" />
          </li>
        ))}
      </ul>

      <dl className="mt-4">
        <div className="u-spec">
          <dt>{t('cart.subtotal')}</dt>
          <dd>
            <Price usd={subtotalUsd} />
          </dd>
        </div>

        {discountUsd > 0 ? (
          <div className="u-spec">
            <dt className="text-accent">
              {t('checkout.couponApplied')} · {coupon?.code}
            </dt>
            <dd className="text-accent">
              −<Price usd={discountUsd} />
            </dd>
          </div>
        ) : null}

        <div className="u-spec">
          <dt>{t('cart.shipping')}</dt>
          <dd>{shippingUsd === 0 ? t('cart.shipping.free') : <Price usd={shippingUsd} />}</dd>
        </div>

        <div className="u-spec border-b-0">
          <dt className="text-fg">{t('cart.total')}</dt>
          <dd className="text-base font-medium">
            <Price usd={totalUsd} />
          </dd>
        </div>
      </dl>

      <p className="u-label mt-4 leading-relaxed normal-case tracking-normal">
        {t('checkout.howItWorks')}
      </p>
    </aside>
  )

  return (
    <div className="u-page grid gap-10 pb-28 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <p className="u-measure text-[0.9375rem] leading-relaxed text-fg-mid">
          {t('checkout.lede')}
        </p>

        {/* ── 1 · datos personales ── */}
        <section className="mt-10 border-t border-rule pt-6" aria-labelledby="datos">
          <h2 id="datos" className="u-label text-fg">
            {t('checkout.section.contact')}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="u-label mb-2 block" htmlFor="nombre">
                {t('checkout.firstName')}
              </label>
              <input
                id="nombre"
                name="given-name"
                autoComplete="given-name"
                className="u-field"
                data-cursor="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="u-label mb-2 block" htmlFor="apellido">
                {t('checkout.lastName')}
              </label>
              <input
                id="apellido"
                name="family-name"
                autoComplete="family-name"
                className="u-field"
                data-cursor="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="u-label mb-2 block" htmlFor="telefono">
                {t('checkout.phone')}
              </label>
              <input
                id="telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="u-field"
                data-cursor="text"
                placeholder="+595 9xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="u-label mt-2 normal-case tracking-normal">{t('checkout.phoneHint')}</p>
            </div>
          </div>
        </section>

        {/* ── 2 · entrega ── */}
        <section className="mt-10 border-t border-rule pt-6" aria-labelledby="entrega">
          <h2 id="entrega" className="u-label text-fg">
            {t('checkout.section.delivery')}
          </h2>

          <fieldset className="mt-5">
            <legend className="u-label mb-3">{t('checkout.zone')}</legend>
            <div className="flex flex-col gap-2">
              {zones.map((z) => (
                <label
                  key={z.slug}
                  className={`flex cursor-pointer items-start gap-3 border p-4 rounded-part transition-colors duration-200 ease-rail ${
                    zoneSlug === z.slug ? 'border-accent' : 'border-rule hover:border-fg-low'
                  }`}
                >
                  <input
                    type="radio"
                    name="zona"
                    value={z.slug}
                    checked={zoneSlug === z.slug}
                    onChange={() => setZoneSlug(z.slug)}
                    className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[0.9375rem] text-fg">{z.name[locale]}</span>
                      <span className="font-mono text-[0.75rem] tabular-nums text-fg-mid">
                        {shippingFor(z, netUsd) === 0 ? (
                          t('cart.shipping.free')
                        ) : (
                          <Price usd={z.costUsd} />
                        )}
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.8125rem] leading-snug text-fg-mid">
                      {z.note[locale]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {zone?.requiresAddress ? (
            <div className="mt-5">
              <label className="u-label mb-2 block" htmlFor="direccion">
                {t('checkout.address')}
              </label>
              <input
                id="direccion"
                autoComplete="street-address"
                className="u-field"
                data-cursor="text"
                placeholder={t('checkout.addressPlaceholder')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div className="mt-5">
            <label className="u-label mb-2 flex items-baseline gap-2" htmlFor="notas">
              {t('checkout.notes')}
              <span className="text-fg-low">{t('checkout.notesOptional')}</span>
            </label>
            <textarea
              id="notas"
              rows={3}
              className="u-field resize-y"
              data-cursor="text"
              placeholder={t('checkout.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </section>

        {/* ── 3 · cupón ── */}
        <section className="mt-10 border-t border-rule pt-6" aria-labelledby="cupon">
          <h2 id="cupon" className="u-label text-fg">
            {t('checkout.section.coupon')}
          </h2>

          {coupon ? (
            <p className="mt-4 flex flex-wrap items-center gap-3 text-[0.9375rem]">
              <span className="u-tag text-accent">{coupon.code}</span>
              <span className="text-fg-mid">
                {t('checkout.couponApplied')} · −<Price usd={discountUsd} />
              </span>
              <button
                type="button"
                onClick={() => {
                  setCoupon(null)
                  setCouponError(null)
                }}
                className="u-link u-tap font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-fg-low hover:text-fg"
              >
                {t('checkout.couponRemove')}
              </button>
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="cupon-codigo">
                  {t('checkout.section.coupon')}
                </label>
                <input
                  id="cupon-codigo"
                  className="u-field flex-1 uppercase"
                  data-cursor="text"
                  placeholder={t('checkout.couponPlaceholder')}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void aplicarCupon()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void aplicarCupon()}
                  disabled={checkingCoupon || couponInput.trim() === ''}
                  className="u-btn u-btn-line"
                >
                  {checkingCoupon ? '…' : t('checkout.couponApply')}
                </button>
              </div>

              {couponError ? (
                <p className="mt-3 text-[0.8125rem] text-amber" role="alert">
                  {couponError}
                </p>
              ) : null}
            </>
          )}
        </section>

        {/* ── enviar ── */}
        <div className="mt-10 border-t border-rule pt-8">
          {error ? (
            <p className="mb-4 text-[0.9375rem] text-rust" role="alert" data-testid="error-checkout">
              {error}
            </p>
          ) : null}

          {hasWhatsapp ? (
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={sending}
              data-testid="enviar-pedido"
              data-lead=""
              className="u-cta u-cta--block"
            >
              <CtaBody>
                <span className="u-invite">
                  {sending ? t('checkout.sending') : t('checkout.send')}
                </span>
                <span className="u-nudge" aria-hidden="true">
                  →
                </span>
              </CtaBody>
            </button>
          ) : (
            <p className="text-[0.9375rem] text-fg-mid">{t('checkout.howItWorks')}</p>
          )}

          <Link
            href={path('/carrito')}
            className="u-link u-tap mt-5 inline-block font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-fg-mid"
          >
            {t('cta.reviewCart')}
          </Link>
        </div>
      </div>

      <div className="lg:col-span-5">{resumen}</div>
    </div>
  )
}

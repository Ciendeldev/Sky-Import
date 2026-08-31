'use client'

/**
 * ZONAS DE ENVÍO Y CUPONES EN EL CLIENTE
 *
 * Las zonas se leen de la base cuando hay Supabase, y caen a un juego mínimo
 * cuando todavía no lo hay: la tienda tiene que poder venderse el primer día,
 * antes de que existan las claves.
 *
 * El cupón NO se valida acá. Se manda a `validate_coupon`, que vive en la base
 * y devuelve el descuento ya calculado. El navegador nunca ve la lista de
 * códigos ni sus condiciones: si esto fuera un cálculo de cliente, cualquiera
 * podría leer el bundle y descubrir los cupones vigentes.
 */

import { hasSupabaseBrowser, supabaseBrowser } from '@/lib/supabase/client'
import type { Locale } from '@/lib/i18n/locales'
import type { ShippingZoneRow, ValidateCouponResult } from '@/lib/supabase/types'

export interface Zone {
  slug: string
  name: { es: string; pt: string }
  note: { es: string; pt: string }
  costUsd: number
  /** Neto a partir del cual el envío es gratis. `null` = nunca por monto. */
  freeOverUsd: number | null
  requiresAddress: boolean
}

/**
 * Las tres zonas de arranque, iguales a las de la migración de datos base.
 * Con Supabase conectado, mandan las de la base y el operador las edita.
 */
export const FALLBACK_ZONES: Zone[] = [
  {
    slug: 'retiro-local',
    name: { es: 'Retiro en el local', pt: 'Retirada na loja' },
    note: {
      es: 'Ciudad del Este. Coordinamos horario por WhatsApp.',
      pt: 'Ciudad del Este. Combinamos o horário pelo WhatsApp.',
    },
    costUsd: 0,
    freeOverUsd: null,
    requiresAddress: false,
  },
  {
    slug: 'gran-asuncion',
    name: { es: 'Gran Asunción', pt: 'Grande Assunção' },
    note: {
      es: 'Asunción y Área Metropolitana. Entrega coordinada por WhatsApp.',
      pt: 'Assunção e Região Metropolitana. Entrega combinada pelo WhatsApp.',
    },
    costUsd: 5,
    freeOverUsd: 400,
    requiresAddress: true,
  },
  {
    slug: 'interior',
    name: { es: 'Interior del país', pt: 'Interior do país' },
    note: {
      es: 'Envío por empresa de transporte. El plazo depende de la ciudad.',
      pt: 'Envio por transportadora. O prazo depende da cidade.',
    },
    costUsd: 8,
    freeOverUsd: 400,
    requiresAddress: true,
  },
]

function toZone(row: ShippingZoneRow): Zone {
  return {
    slug: row.slug,
    name: { es: row.name_es, pt: row.name_pt },
    note: { es: row.note_es, pt: row.note_pt },
    costUsd: Number(row.cost_usd),
    freeOverUsd: row.free_over_usd === null ? null : Number(row.free_over_usd),
    requiresAddress: row.requires_address,
  }
}

export async function fetchZones(): Promise<Zone[]> {
  if (!hasSupabaseBrowser) return FALLBACK_ZONES
  try {
    const { data, error } = await supabaseBrowser()
      .from('shipping_zones')
      .select('*')
      .eq('active', true)
      .order('sort_order')
    if (error || !data || data.length === 0) return FALLBACK_ZONES
    return data.map(toZone)
  } catch {
    // Sin red, la tienda sigue vendiendo con las zonas de arranque.
    return FALLBACK_ZONES
  }
}

/** Costo de envío de una zona para un neto dado. */
export function shippingFor(zone: Zone | null, netUsd: number): number {
  if (!zone) return 0
  if (zone.freeOverUsd !== null && netUsd >= zone.freeOverUsd) return 0
  return zone.costUsd
}

export function zoneName(zone: Zone | null, locale: Locale): string {
  return zone ? zone.name[locale] : ''
}

// ─────────────────────────────────────────────────────────────────── cupones

export type CouponCheck =
  | { ok: true; code: string; discountUsd: number }
  | { ok: false; reason: string; minPurchaseUsd?: number }

export async function checkCoupon(code: string, subtotalUsd: number): Promise<CouponCheck> {
  const limpio = code.trim()
  if (!limpio) return { ok: false, reason: 'not_found' }

  if (!hasSupabaseBrowser) {
    // Sin base no hay cupones que comprobar. Se dice, en vez de aceptar uno
    // que después el vendedor tendría que rechazar por WhatsApp.
    return { ok: false, reason: 'offline' }
  }

  try {
    const { data, error } = await supabaseBrowser().rpc('validate_coupon', {
      p_code: limpio,
      p_subtotal_usd: subtotalUsd,
    })

    if (error || !data) return { ok: false, reason: 'offline' }

    const result = data as ValidateCouponResult
    if (result.ok) {
      return { ok: true, code: result.code, discountUsd: Number(result.discount_usd) }
    }
    return {
      ok: false,
      reason: result.reason,
      minPurchaseUsd: result.min_purchase_usd,
    }
  } catch {
    return { ok: false, reason: 'offline' }
  }
}

// ─────────────────────────────────────────────────────────────────── pedidos

export interface PlaceOrderInput {
  items: Array<{ slug: string; variant_sku?: string | null; qty: number }>
  customer: {
    first_name: string
    last_name: string
    phone: string
    address?: string
    notes?: string
    locale: Locale
  }
  zoneSlug: string
  couponCode?: string | null
}

export type PlaceOrderOutcome =
  /** Quedó registrado. `number` es el que va en el mensaje. */
  | { status: 'registrado'; number: string }
  /**
   * No se pudo registrar, pero la venta SIGUE. Pasa cuando no hay base
   * conectada, cuando el catálogo todavía no se importó o cuando el servicio
   * no responde. El vendedor confirma por WhatsApp, como haría igual.
   */
  | { status: 'sin-registro'; reason: string }
  /**
   * La venta NO puede seguir. Un solo caso: no hay unidades suficientes.
   * Mandar por WhatsApp un pedido que no se puede cumplir es peor que
   * detenerlo acá.
   */
  | { status: 'bloqueado'; message: string }

/**
 * Registra el pedido antes de abrir WhatsApp.
 *
 * El cliente manda QUÉ pide, no cuánto cuesta: la función de la base relee los
 * precios y descuenta el stock en la misma transacción.
 *
 * **El registro nunca puede costar una venta.** Es una ayuda de seguimiento
 * comercial, no un requisito para vender: la tienda vendía por WhatsApp antes
 * de tener base y tiene que poder seguir haciéndolo si la base falla. Por eso
 * el único fallo que detiene el pedido es el de stock, que es un hecho del
 * negocio y no de la infraestructura.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderOutcome> {
  if (!hasSupabaseBrowser) {
    return { status: 'sin-registro', reason: 'sin base configurada' }
  }

  try {
    const { data, error } = await supabaseBrowser().rpc('place_order', {
      p_items: input.items,
      p_customer: input.customer,
      p_zone_slug: input.zoneSlug,
      p_coupon_code: input.couponCode ?? null,
    })

    if (error) {
      // El mensaje de la excepción de Postgres viaja en `message`. El de stock
      // es el único que el cliente necesita ver y el único que detiene todo.
      if (/sin stock suficiente/i.test(error.message)) {
        return { status: 'bloqueado', message: error.message }
      }
      return { status: 'sin-registro', reason: error.message }
    }

    const number = (data as { order_number?: string } | null)?.order_number
    return number
      ? { status: 'registrado', number }
      : { status: 'sin-registro', reason: 'la base no devolvió número de pedido' }
  } catch (e) {
    // Red caída, servicio reiniciando, CORS… nada de esto es asunto del
    // cliente que está intentando comprar.
    return { status: 'sin-registro', reason: e instanceof Error ? e.message : 'error de red' }
  }
}

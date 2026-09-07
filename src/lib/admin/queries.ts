import 'server-only'

import { hasSupabase, supabaseServer } from '@/lib/supabase/server'
import type {
  CategoryRow,
  CouponRow,
  FxSettings,
  OrderItemRow,
  OrderRow,
  ProductRow,
  RulesSettings,
  ShippingZoneRow,
  VariantRow,
} from '@/lib/supabase/types'

/**
 * CONSULTAS DEL PANEL
 *
 * Todas usan el cliente con la sesión del operador, no la clave de servicio:
 * si un día una política RLS estuviera mal, el panel lo nota en vez de
 * enmascararlo con privilegios totales.
 *
 * Todas empiezan comprobando que Supabase esté configurado, y devuelven vacío
 * si no lo está. No es paranoia: Next renderiza la página EN PARALELO con su
 * layout, así que estas consultas arrancan antes de que el guard del layout
 * llegue a redirigir. Sin la comprobación, una visita a `/admin` sin claves
 * revienta en el servidor en lugar de llevar a la pantalla de acceso.
 */

export interface ProductWithVariants extends ProductRow {
  product_variants: VariantRow[]
}

export async function listProducts(): Promise<ProductWithVariants[]> {
  if (!hasSupabase) return []
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .order('category_slug')
    .order('name')
  return (data as ProductWithVariants[] | null) ?? []
}

export async function getProduct(id: string): Promise<ProductWithVariants | null> {
  if (!hasSupabase) return null
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .maybeSingle()
  return (data as ProductWithVariants | null) ?? null
}

export async function listCategories(): Promise<CategoryRow[]> {
  if (!hasSupabase) return []
  const supabase = await supabaseServer()
  const { data } = await supabase.from('categories').select('*').order('sort_order')
  return data ?? []
}

export async function listCoupons(): Promise<CouponRow[]> {
  if (!hasSupabase) return []
  const supabase = await supabaseServer()
  const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function listShippingZones(): Promise<ShippingZoneRow[]> {
  if (!hasSupabase) return []
  const supabase = await supabaseServer()
  const { data } = await supabase.from('shipping_zones').select('*').order('sort_order')
  return data ?? []
}

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[]
}

export async function listOrders(limit = 100): Promise<OrderWithItems[]> {
  if (!hasSupabase) return []
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as OrderWithItems[] | null) ?? []
}

export async function getSettings(): Promise<{ fx: FxSettings; rules: RulesSettings }> {
  // Sin base, se responden los mismos valores que trae `src/config/site.ts`:
  // la tienda no cambia de comportamiento por no tener Supabase configurado.
  const data = hasSupabase
    ? ((await (await supabaseServer()).from('settings').select('key, value').in('key', ['fx', 'rules']))
        .data ?? [])
    : []

  const map = new Map(data.map((row) => [row.key, row.value]))

  // Los valores por defecto son los mismos que los de `src/config/site.ts`:
  // si la base todavía no tiene la fila, la tienda no cambia de comportamiento.
  const fx = (map.get('fx') as FxSettings | undefined) ?? {
    PYG: 7400,
    BRL: 5.4,
    reference: '2026-08',
    auto: false,
    updated_at: new Date().toISOString(),
  }

  const rules = (map.get('rules') as RulesSettings | undefined) ?? {
    lowStockAt: 3,
  }

  return { fx, rules }
}

// ────────────────────────────────────────────────────── alertas de inventario

export type StockLevel = 'agotado' | 'bajo' | 'ok'

/**
 * El nivel se DERIVA del stock y del umbral. No hay ningún campo «agotado» en
 * la base que pueda contradecir a `units`, igual que en la tienda pública.
 *
 * El umbral es el del producto si lo tiene, y el global si no: así una pieza
 * que se vende de a diez puede avisar antes que un gabinete.
 */
export function stockLevelOf(
  units: number,
  minStock: number | null,
  globalLowStock: number,
): StockLevel {
  if (units <= 0) return 'agotado'
  if (units <= (minStock ?? globalLowStock)) return 'bajo'
  return 'ok'
}

export interface StockAlert {
  id: string
  name: string
  ref: string
  units: number
  level: Exclude<StockLevel, 'ok'>
}

/** Lo que el operador tiene que mirar hoy: agotados primero, luego los bajos. */
export async function listStockAlerts(): Promise<StockAlert[]> {
  if (!hasSupabase) return []
  const supabase = await supabaseServer()
  const { rules } = await getSettings()

  const { data } = await supabase
    .from('products')
    .select('id, name, ref, units, min_stock')
    .eq('active', true)

  const alertas: StockAlert[] = []
  for (const p of data ?? []) {
    const level = stockLevelOf(p.units, p.min_stock, rules.lowStockAt)
    if (level === 'ok') continue
    alertas.push({ id: p.id, name: p.name, ref: p.ref, units: p.units, level })
  }

  return alertas.sort(
    (a, b) => Number(b.level === 'agotado') - Number(a.level === 'agotado') || a.units - b.units,
  )
}

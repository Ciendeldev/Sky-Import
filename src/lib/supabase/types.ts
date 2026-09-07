/**
 * TIPOS DE LA BASE
 *
 * Espejo tipado del esquema de `supabase/migrations/`. Está escrito a mano y no
 * generado, por dos motivos: el proyecto ya define los tipos de dominio con
 * mucho cuidado (`src/lib/catalog/types.ts`) y estos tienen que encajar con
 * ellos, no sustituirlos; y un archivo generado de miles de líneas es
 * exactamente el tipo de cosa que nadie vuelve a leer.
 *
 * Regla: si cambia una migración, cambia este archivo en el mismo commit.
 */

import type { Compat, RenderSpec, Spec } from '@/lib/catalog/types'

/** Texto de datos que existe en los dos idiomas, tal como viaja en la base. */
export type Bilingual = {
  es: string
  pt: string
}

export type CouponKind = 'percent' | 'fixed'

export const ORDER_STATUSES = [
  'iniciado_whatsapp',
  'confirmado',
  'preparando',
  'entregado',
  'cancelado',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

// ─────────────────────────────────────────────────────────────────── filas

export type CategoryRow = {
  slug: string
  name_es: string
  name_pt: string
  role_es: string
  role_pt: string
  shape: string
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export type ProductImage = {
  url: string
  alt_es: string
  alt_pt: string
}

export type ProductRow = {
  id: string
  slug: string
  ref: string
  name: string
  brand: string
  model: string
  category_slug: string
  price_usd: number
  list_price_usd: number | null
  units: number
  min_stock: number | null
  arrived_recently: boolean
  featured: boolean
  active: boolean
  blurb_es: string
  blurb_pt: string
  specs: Spec[]
  compat: Compat
  render: RenderSpec
  images: ProductImage[]
  created_at: string
  updated_at: string
}

/**
 * Los ejes de la variante son abiertos: en componentes de PC una variante es
 * capacidad, velocidad, formato o color del gabinete, no «talla». Cada producto
 * declara los suyos y no hay columnas fijas que queden vacías para media tienda.
 */
export type VariantAttributes = Record<string, string>

export type VariantRow = {
  id: string
  product_id: string
  sku: string
  label_es: string
  label_pt: string
  attributes: VariantAttributes
  /** `null` = hereda el precio del producto. */
  price_usd: number | null
  units: number
  image_url: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export type ShippingZoneRow = {
  id: string
  slug: string
  name_es: string
  name_pt: string
  note_es: string
  note_pt: string
  /**
   * MUERTA. El envío no tiene importe: se acuerda por WhatsApp, y ninguna
   * pantalla lo enseña. La columna sigue en la base, siempre en `null`, y
   * este espejo la declara para no mentir sobre el esquema — pero nada del
   * código la lee. No la reutilices para otra cosa: si hace falta un dato de
   * envío algún día, que tenga su propio nombre.
   */
  cost_usd: number | null
  requires_address: boolean
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export type CouponRow = {
  id: string
  code: string
  kind: CouponKind
  value: number
  min_purchase_usd: number
  starts_at: string | null
  expires_at: string | null
  max_uses: number | null
  used_count: number
  active: boolean
  created_at: string
  updated_at: string
}

export type OrderRow = {
  id: string
  number: string
  status: OrderStatus
  first_name: string
  last_name: string
  phone: string
  zone_slug: string | null
  zone_name: string
  address: string
  notes: string
  coupon_code: string | null
  subtotal_usd: number
  discount_usd: number
  shipping_usd: number
  total_usd: number
  fx_pyg: number
  total_pyg: number
  locale: string
  admin_note: string
  created_at: string
  updated_at: string
}

export type OrderItemRow = {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  sku: string
  name: string
  variant_label: string
  qty: number
  unit_price_usd: number
  subtotal_usd: number
  created_at: string
}

// ────────────────────────────────────────────────────────── configuración

/** Tasa de cambio. El USD es la fuente; estas dos se derivan de él. */
export type FxSettings = {
  PYG: number
  BRL: number
  /** Mes de la referencia, en texto plano. Nunca se calcula en render. */
  reference: string
  /** Si la actualización es automática desde una fuente externa. */
  auto: boolean
  updated_at: string
}

export type RulesSettings = {
  lowStockAt: number
}

export type ContactSettings = {
  whatsapp: string
  whatsappDisplay: string
}

export type SettingsMap = {
  fx: FxSettings
  rules: RulesSettings
  contact: ContactSettings
}

export type SettingKey = keyof SettingsMap

// ──────────────────────────────────────────── respuestas de las funciones

export type ValidateCouponResult =
  | {
      ok: true
      code: string
      kind: CouponKind
      value: number
      discount_usd: number
    }
  | {
      ok: false
      reason: 'not_found' | 'inactive' | 'not_started' | 'expired' | 'exhausted' | 'below_minimum'
      min_purchase_usd?: number
    }

export type PlaceOrderResult = {
  ok: true
  order_number: string
  subtotal_usd: number
  discount_usd: number
  shipping_usd: number
  total_usd: number
  total_pyg: number
  fx_pyg: number
}

// ─────────────────────────────────────────────────── contrato del cliente

/**
 * Las relaciones declaradas no son decorativas: son lo que permite que
 * `select('*, product_variants(*)')` devuelva un tipo y no `never`. Solo se
 * declaran las que el código realmente atraviesa.
 */
export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: { user_id: string; username: string; full_name: string | null; created_at: string }
        Insert: { user_id: string; username: string; full_name?: string | null }
        Update: { username?: string; full_name?: string | null }
        Relationships: []
      }
      categories: {
        Row: CategoryRow
        Insert: Partial<CategoryRow> & Pick<CategoryRow, 'slug' | 'name_es' | 'name_pt'>
        Update: Partial<CategoryRow>
        Relationships: []
      }
      products: {
        Row: ProductRow
        Insert: Partial<ProductRow> &
          Pick<ProductRow, 'slug' | 'ref' | 'name' | 'category_slug' | 'price_usd'>
        Update: Partial<ProductRow>
        Relationships: [
          {
            foreignKeyName: 'products_category_slug_fkey'
            columns: ['category_slug']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['slug']
          },
        ]
      }
      product_variants: {
        Row: VariantRow
        Insert: Partial<VariantRow> &
          Pick<VariantRow, 'product_id' | 'sku' | 'label_es' | 'label_pt'>
        Update: Partial<VariantRow>
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      shipping_zones: {
        Row: ShippingZoneRow
        Insert: Partial<ShippingZoneRow> & Pick<ShippingZoneRow, 'slug' | 'name_es' | 'name_pt'>
        Update: Partial<ShippingZoneRow>
        Relationships: []
      }
      coupons: {
        Row: CouponRow
        Insert: Partial<CouponRow> & Pick<CouponRow, 'code' | 'kind' | 'value'>
        Update: Partial<CouponRow>
        Relationships: []
      }
      orders: {
        Row: OrderRow
        Insert: Partial<OrderRow> &
          Pick<OrderRow, 'first_name' | 'last_name' | 'phone' | 'fx_pyg'>
        Update: Partial<OrderRow>
        Relationships: [
          {
            foreignKeyName: 'orders_zone_slug_fkey'
            columns: ['zone_slug']
            isOneToOne: false
            referencedRelation: 'shipping_zones'
            referencedColumns: ['slug']
          },
        ]
      }
      order_items: {
        Row: OrderItemRow
        Insert: Partial<OrderItemRow> &
          Pick<OrderItemRow, 'order_id' | 'sku' | 'name' | 'qty' | 'unit_price_usd' | 'subtotal_usd'>
        Update: Partial<OrderItemRow>
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      settings: {
        Row: { key: string; value: unknown; updated_at: string; updated_by: string | null }
        Insert: { key: string; value: unknown; updated_by?: string | null }
        Update: { value?: unknown; updated_by?: string | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean }
      validate_coupon: {
        Args: { p_code: string; p_subtotal_usd: number }
        Returns: ValidateCouponResult
      }
      place_order: {
        Args: {
          p_items: Array<{ slug: string; variant_sku?: string | null; qty: number }>
          p_customer: {
            first_name: string
            last_name: string
            phone: string
            address?: string
            notes?: string
            locale?: string
          }
          p_zone_slug: string
          p_coupon_code?: string | null
        }
        Returns: PlaceOrderResult
      }
    }
    Enums: {
      coupon_kind: CouponKind
      order_status: OrderStatus
    }
    CompositeTypes: Record<string, never>
  }
}

import 'server-only'

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FX, RULES } from '@/config/site'
import { PRODUCTS } from './products'
import { STORE_PRODUCT_COLUMNS, snapshotFrom } from './fromRows'
import type { CatalogSnapshot } from './live'
import type { Database } from '@/lib/supabase/types'

/**
 * CARGA DEL CATÁLOGO VIGENTE
 *
 * Mismo criterio que `variantsServer.ts`: cliente ANÓNIMO y SIN COOKIES. Las
 * páginas de la tienda son estáticas con revalidación, y leer cookies las
 * volvería dinámicas para nada: precios y stock son públicos y no dependen de
 * quién mire. Lo que se puede leer lo decide RLS —solo productos activos y
 * solo las claves públicas de `settings`—.
 *
 * `cache` de React hace que el layout y la página de una misma petición
 * compartan una sola consulta.
 *
 * Nunca lanza. Sin claves, con la base caída o con una respuesta rara, la
 * tienda sale con el archivo: se pierde la frescura, no la venta.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const RESPALDO: CatalogSnapshot = {
  products: PRODUCTS,
  fx: { PYG: FX.PYG, BRL: FX.BRL },
  lowStockAt: RULES.lowStockAt,
  origin: 'archivo',
}

export const loadCatalog = cache(async (): Promise<CatalogSnapshot> => {
  if (!URL || !ANON) return RESPALDO

  try {
    const supabase = createClient<Database>(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const [productos, ajustes] = await Promise.all([
      supabase
        .from('products')
        .select(STORE_PRODUCT_COLUMNS)
        .eq('active', true)
        .order('created_at'),
      supabase.from('settings').select('key, value').in('key', ['fx', 'rules']),
    ])

    if (productos.error) {
      console.error('[sky-import] catálogo: se usa el archivo.', productos.error.message)
      return RESPALDO
    }

    return snapshotFrom(productos.data, ajustes.data, RESPALDO)
  } catch (error) {
    console.error('[sky-import] catálogo: se usa el archivo.', error)
    return RESPALDO
  }
})

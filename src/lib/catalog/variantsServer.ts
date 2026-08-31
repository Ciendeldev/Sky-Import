import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { toVariant, type Variant } from '@/lib/variants'
import type { Database } from '@/lib/supabase/types'

/**
 * Variantes de una pieza, leídas en el servidor.
 *
 * Usa un cliente ANÓNIMO SIN COOKIES a propósito. La ficha de producto es una
 * página estática con revalidación, y leer cookies la convertiría en dinámica:
 * el catálogo entero pasaría a renderizarse en cada visita para nada, porque
 * las variantes son datos públicos que no dependen de quién mire.
 *
 * Devuelve una lista vacía —no un error— cuando todavía no hay Supabase
 * conectado o cuando la pieza no tiene variantes. Sin variantes, la ficha es
 * exactamente la de siempre.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function variantsForSlug(slug: string): Promise<Variant[]> {
  if (!URL || !ANON) return []

  try {
    const supabase = createClient<Database>(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!product) return []

    const { data } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('active', true)
      .order('sort_order')

    return (data ?? []).map(toVariant)
  } catch {
    // Un fallo de red no puede dejar sin ficha a un producto del catálogo.
    return []
  }
}

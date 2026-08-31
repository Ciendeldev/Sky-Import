'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Cliente de Supabase para el NAVEGADOR.
 *
 * Usa la clave anónima, que es pública por diseño: lo que protege los datos son
 * las políticas RLS de `supabase/migrations/20260831000200_rls.sql`, no el
 * secreto de esta clave. La clave de servicio NUNCA llega hasta acá.
 *
 * Se crea una sola vez por pestaña. `createBrowserClient` ya devuelve la misma
 * instancia si se le llama otra vez, pero guardarla evita rehacer el trabajo en
 * cada render de un componente de cliente.
 */

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null

export function supabaseBrowser() {
  if (cached) return cached
  cached = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return cached
}

/**
 * Si la tienda todavía no tiene Supabase configurado, la interfaz no debe
 * romperse: cae al catálogo estático del proyecto. Esto permite desarrollar y
 * desplegar antes de que existan las claves.
 */
export const hasSupabaseBrowser =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

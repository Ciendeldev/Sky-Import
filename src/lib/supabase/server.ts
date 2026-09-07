import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Clientes de Supabase para el SERVIDOR.
 *
 * Hay dos, y la diferencia importa:
 *
 *   · `supabaseServer()` — clave anónima + la sesión que viaja en las cookies.
 *     Respeta RLS. Es el que usa el panel de administración: si la sesión no es
 *     de un administrador, la base misma le niega la escritura, aunque alguien
 *     encuentre la ruta.
 *
 *   · `supabaseAdmin()` — clave de servicio. **SALTA TODAS LAS POLÍTICAS RLS.**
 *     Solo para tareas de aprovisionamiento (crear el usuario administrador,
 *     importar el catálogo inicial). Nunca para atender una petición del
 *     público, y nunca en un componente de cliente.
 *
 * El `import 'server-only'` de arriba no es decorativo: si alguien importa este
 * archivo desde un componente de cliente, la compilación falla en vez de filtrar
 * la clave de servicio al navegador.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/** Si la tienda todavía no tiene Supabase, se sirve el catálogo estático. */
export const hasSupabase = Boolean(URL) && Boolean(ANON)
export const hasSupabaseAdmin = hasSupabase && Boolean(SERVICE)

export async function supabaseServer() {
  const store = await cookies()

  return createServerClient<Database>(URL, ANON, {
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options)
          }
        } catch {
          // Llamado desde un Server Component: las cookies son de solo lectura.
          // El refresco de sesión lo hace el proxy, así que se puede ignorar.
        }
      },
    },
  })
}

/**
 * Cliente con privilegios totales. Cada llamada crea una instancia nueva y sin
 * persistencia de sesión a propósito: no debe existir una sesión global con la
 * clave de servicio flotando entre peticiones.
 */
export function supabaseAdmin() {
  if (!hasSupabaseAdmin) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Es obligatoria para las tareas de administración; ver .env.example.',
    )
  }
  return createClient<Database>(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Reautenticación aislada: comprobar una clave nunca reemplaza las cookies del operador. */
export function supabasePasswordCheck() {
  return createClient<Database>(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

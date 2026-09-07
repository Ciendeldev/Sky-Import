import 'server-only'

import { cache } from 'react'
import { supabaseServer, hasSupabase } from '@/lib/supabase/server'
import { panelRole, USERNAME_PATTERN, type PanelRole } from './account-policy'

/**
 * SESIÓN DE ADMINISTRADOR
 *
 * Tres capas, y las tres tienen que decir que sí:
 *
 *   1. Supabase Auth valida la contraseña. Nunca la vemos: viaja al servicio y
 *      vuelve una sesión. En el repositorio no hay ninguna contraseña, ni en
 *      claro ni hasheada.
 *   2. La tabla `admin_users` dice si ese usuario puede administrar. Tener
 *      cuenta no alcanza; hay que estar en la lista.
 *   3. Las políticas RLS lo comprueban otra vez del lado de la base. Aunque
 *      alguien encontrara una ruta sin guard, Postgres le niega la escritura.
 *
 * El panel pide «usuario», no «correo». Supabase Auth necesita un correo, así
 * que se traduce acá: `Cielo` → `ADMIN_EMAIL`. El correo es un detalle interno
 * que el operador nunca escribe.
 */

export interface AdminSession {
  userId: string
  username: string
  fullName: string | null
  email: string
  role: PanelRole
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'Cielo'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'cielo@skyimport.local'

/**
 * Traduce el usuario al correo interno. La cuenta original conserva el
 * correo configurado. Las nuevas usan un correo
 * interno determinista: Supabase garantiza su unicidad incluso con altas simultáneas.
 */
export function emailForUsername(username: string): string | null {
  const limpio = username.trim()
  if (!limpio) return null
  if (limpio.toLowerCase() === ADMIN_USERNAME.toLowerCase()) return ADMIN_EMAIL
  // Quien escriba el correo entero también entra: es útil y no abre nada.
  if (limpio.includes('@')) return limpio.toLowerCase()
  if (USERNAME_PATTERN.test(limpio)) return limpio.toLowerCase() + '@users.skyimport.local'
  return null
}

/**
 * La sesión vigente, o `null`. Va envuelta en `cache` para que varias llamadas
 * dentro del mismo render no golpeen el servicio de autenticación otra vez.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!hasSupabase) return null

  const supabase = await supabaseServer()

  // `getUser` valida el token contra el servicio. `getSession` se conforma con
  // lo que traiga la cookie, que es justo lo que no queremos para un guard.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id, username, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) return null

  return {
    userId: admin.user_id,
    username: admin.username,
    fullName: admin.full_name,
    email: user.email ?? '',
    role: panelRole(user.app_metadata),
  }
})

/** Igual que la anterior, pero para código que no puede seguir sin sesión. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) throw new Error('NO_AUTORIZADO')
  return session
}

/** El nombre de usuario configurado, para mostrarlo en la pantalla de acceso. */
export const adminUsernameHint = ADMIN_USERNAME

/** El rol se relee de Auth validado; los datos editables del perfil no autorizan. */
export async function requireModerator(): Promise<AdminSession> {
  const session = await requireAdmin()
  if (session.role !== 'moderator') throw new Error('NO_AUTORIZADO')
  return session
}

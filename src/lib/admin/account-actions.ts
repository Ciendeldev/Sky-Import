'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, requireModerator, emailForUsername, adminUsernameHint } from './auth'
import { hasSupabaseAdmin, supabaseAdmin, supabaseServer, supabasePasswordCheck } from '@/lib/supabase/server'
import { panelRole, passwordError, USERNAME_PATTERN, type PanelAccount } from './account-policy'
import type { ActionResult } from './actions'

const denied: ActionResult = { ok: false, error: 'No tenés permiso para realizar esta acción.' }
const unavailable: ActionResult = { ok: false, error: 'No se pudo completar la operación. Intentá nuevamente.' }

export async function listPanelAccounts(): Promise<PanelAccount[]> {
  await requireModerator()
  const service = supabaseAdmin()
  const { data, error } = await service.from('admin_users').select('user_id, username, full_name').order('created_at')
  if (error) throw new Error('No se pudieron cargar los usuarios.')
  return Promise.all((data ?? []).map(async (row) => {
    const result = await service.auth.admin.getUserById(row.user_id)
    if (result.error || !result.data.user) throw new Error('No se pudieron cargar los usuarios.')
    return { userId: row.user_id, username: row.username, fullName: row.full_name, role: panelRole(result.data.user.app_metadata) }
  }))
}

export async function changeOwnPassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const session = await requireAdmin().catch(() => null)
  if (!session) return denied
  const current = String(form.get('current_password') ?? '')
  const password = String(form.get('new_password') ?? '')
  const confirmation = String(form.get('confirm_password') ?? '')
  const invalid = passwordError(password, confirmation)
  if (invalid) return { ok: false, error: invalid }
  if (!current || current.length > 128) return { ok: false, error: 'Ingresá tu contraseña actual.' }
  if (current === password) return { ok: false, error: 'Elegí una contraseña diferente de la actual.' }

  const verifier = supabasePasswordCheck()
  try {
    const verified = await verifier.auth.signInWithPassword({ email: session.email, password: current })
    if (verified.error || verified.data.user?.id !== session.userId) {
      return { ok: false, error: 'La contraseña actual no es correcta.' }
    }
    const client = await supabaseServer()
    const { error } = await client.auth.updateUser({ password })
    if (error) return { ok: false, error: 'No se pudo cambiar la contraseña. Probá con una clave más segura o volvé a iniciar sesión.' }
    return { ok: true, message: 'Contraseña actualizada.' }
  } catch {
    return unavailable
  } finally {
    // Se cierra solo la sesión temporal de comprobación, nunca la del navegador.
    await verifier.auth.signOut({ scope: 'local' }).catch(() => undefined)
  }
}

export async function createPanelAccount(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireModerator().catch(() => null)
  if (!actor) return denied
  if (!hasSupabaseAdmin) return unavailable

  const username = String(form.get('username') ?? '').trim().toLowerCase()
  const fullName = String(form.get('full_name') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const invalid = passwordError(password, password)
  if (!USERNAME_PATTERN.test(username)) return { ok: false, error: 'Usuario: 3 a 32 caracteres; letras, números, punto, guion o guion bajo.' }
  if (!fullName || fullName.length > 100) return { ok: false, error: 'Completá el nombre, con un máximo de 100 caracteres.' }
  if (invalid) return { ok: false, error: invalid }
  if (username === adminUsernameHint.toLowerCase()) return { ok: false, error: 'Ese usuario ya existe.' }
  const email = emailForUsername(username)
  if (!email) return unavailable

  const service = supabaseAdmin()
  // Escapar "_" impide que ILIKE lo interprete como comodín.
  const existing = await service.from('admin_users').select('user_id').ilike('username', username.replace(/_/g, '\\_')).limit(1)
  if (existing.error) return unavailable
  if (existing.data?.length) return { ok: false, error: 'Ese usuario ya existe.' }
  const created = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { username, full_name: fullName },
    // El formulario jamás decide el rol; toda alta del panel es administrador.
    app_metadata: { panel_role: 'admin' },
  })
  if (created.error || !created.data.user) {
    return { ok: false, error: 'No se pudo crear el usuario. Revisá si ya existe o probá con una contraseña más segura.' }
  }
  const { error } = await service.from('admin_users').insert({
    user_id: created.data.user.id, username, full_name: fullName,
  })
  if (error) {
    // Compensación acotada: únicamente la identidad que acaba de crear esta llamada.
    await service.auth.admin.deleteUser(created.data.user.id)
    return unavailable
  }
  revalidatePath('/admin/configuracion')
  return { ok: true, message: 'Administrador creado. Ya puede ingresar con su usuario y contraseña.' }
}

export async function resetPanelPassword(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireModerator().catch(() => null)
  if (!actor) return denied
  if (!hasSupabaseAdmin) return unavailable
  const userId = String(form.get('user_id') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === actor.userId) return denied
  const password = String(form.get('new_password') ?? '')
  const invalid = passwordError(password, String(form.get('confirm_password') ?? ''))
  if (invalid) return { ok: false, error: invalid }
  const service = supabaseAdmin()
  const member = await service.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  if (member.error || !member.data) return denied
  const target = await service.auth.admin.getUserById(userId)
  if (target.error || !target.data.user || panelRole(target.data.user.app_metadata) === 'moderator') return denied
  const { error } = await service.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: 'No se pudo restablecer la contraseña. Probá con una clave más segura.' }
  return { ok: true, message: 'Contraseña restablecida.' }
}

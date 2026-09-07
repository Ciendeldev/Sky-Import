import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), requireModerator: vi.fn(), service: vi.fn(), server: vi.fn(), verifier: vi.fn(), revalidate: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('@/lib/admin/auth', () => ({
  requireAdmin: mocks.requireAdmin, requireModerator: mocks.requireModerator, adminUsernameHint: 'Cielo',
  emailForUsername: (name: string) => name + '@users.skyimport.local',
}))
vi.mock('@/lib/supabase/server', () => ({
  hasSupabaseAdmin: true, supabaseAdmin: mocks.service, supabaseServer: mocks.server, supabasePasswordCheck: mocks.verifier,
}))
import { changeOwnPassword, createPanelAccount, listPanelAccounts, resetPanelPassword, setPanelAccess } from '@/lib/admin/account-actions'
import { panelRole, passwordError } from '@/lib/admin/account-policy'

const actor = { userId: '11111111-1111-4111-a111-111111111111', username: 'owner', email: 'owner@example.invalid', role: 'moderator' }
function form(values: Record<string, string>) { const data = new FormData(); for (const [k, v] of Object.entries(values)) data.set(k, v); return data }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireAdmin.mockResolvedValue(actor)
  mocks.requireModerator.mockResolvedValue(actor)
})

describe('límites de privilegios', () => {
  it('no concede moderación por roles ausentes o editables del perfil', () => {
    expect(panelRole(undefined)).toBe('admin')
    expect(panelRole({ role: 'moderator', user_metadata: { panel_role: 'moderator' } })).toBe('admin')
    expect(panelRole({ panel_role: 'owner' })).toBe('admin')
    expect(panelRole({ panel_role: 'moderator' })).toBe('moderator')
  })
  it.each(['sin sesión', 'administrador'])('niega todas las operaciones privilegiadas: %s', async () => {
    mocks.requireModerator.mockRejectedValue(new Error('NO_AUTORIZADO'))
    for (const action of [createPanelAccount, resetPanelPassword, setPanelAccess]) expect((await action(null, form({}))).ok).toBe(false)
    await expect(listPanelAccounts()).rejects.toThrow('NO_AUTORIZADO')
    expect(mocks.service).not.toHaveBeenCalled()
  })
  it('niega cambio propio sin sesión y no inicia comprobaciones', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('NO_AUTORIZADO'))
    expect((await changeOwnPassword(null, form({}))).ok).toBe(false)
    expect(mocks.verifier).not.toHaveBeenCalled()
  })
  it('el restablecimiento ajeno no sirve para saltar la contraseña actual', async () => {
    expect((await resetPanelPassword(null, form({ user_id: actor.userId }))).ok).toBe(false)
    expect(mocks.service).not.toHaveBeenCalled()
  })
  it('impide restablecer claves de otros moderadores', async () => {
    const update = vi.fn()
    mocks.service.mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'target' } }) }) }) }),
      auth: { admin: { getUserById: async () => ({ data: { user: { app_metadata: { panel_role: 'moderator' } } } }), updateUserById: update } },
    })
    const password = randomUUID()
    const result = await resetPanelPassword(null, form({ user_id: '22222222-2222-4222-a222-222222222222', new_password: password, confirm_password: password }))
    expect(result.ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('cambio de contraseña', () => {
  it('valida longitud y confirmación antes de autenticarse', () => {
    expect(passwordError('a'.repeat(11), 'a'.repeat(11))).not.toBeNull()
    expect(passwordError('a'.repeat(129), 'a'.repeat(129))).not.toBeNull()
    expect(passwordError('a'.repeat(12), 'b'.repeat(12))).not.toBeNull()
    expect(passwordError('a'.repeat(12), 'a'.repeat(12))).toBeNull()
  })
  it.each(['clave incorrecta', 'identidad distinta'])('no actualiza nada con %s', async (scenario) => {
    const signOut = vi.fn().mockResolvedValue({})
    mocks.verifier.mockReturnValue({ auth: { signInWithPassword: async () => ({
      data: { user: scenario === 'identidad distinta' ? { id: 'other' } : null },
      error: scenario === 'clave incorrecta' ? {} : null,
    }), signOut } })
    const password = randomUUID()
    expect((await changeOwnPassword(null, form({ current_password: randomUUID(), new_password: password, confirm_password: password }))).ok).toBe(false)
    expect(mocks.server).not.toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('actualiza solo después de validar la identidad y limpia la sesión temporal', async () => {
    const signOut = vi.fn().mockResolvedValue({})
    const updateUser = vi.fn().mockResolvedValue({})
    mocks.verifier.mockReturnValue({ auth: { signInWithPassword: async () => ({ data: { user: { id: actor.userId } } }), signOut } })
    mocks.server.mockResolvedValue({ auth: { updateUser } })
    const password = randomUUID()
    const result = await changeOwnPassword(null, form({ current_password: randomUUID(), new_password: password, confirm_password: password }))
    expect(result.ok).toBe(true)
    expect(updateUser).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(result).includes(password)).toBe(false)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})

describe('alta consistente', () => {
  it('ignora el rol enviado y compensa si falla la fila de permisos', async () => {
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'new-only' } } })
    const deleteUser = vi.fn().mockResolvedValue({})
    const ilike = vi.fn().mockReturnValue({ limit: async () => ({ data: [] }) })
    mocks.service.mockReturnValue({
      from: () => ({ select: () => ({ ilike }), insert: async () => ({ error: { code: '23505' } }) }),
      auth: { admin: { createUser, deleteUser } },
    })
    const result = await createPanelAccount(null, form({ username: 'Test_User', full_name: 'Prueba', password: randomUUID(), role: 'moderator' }))
    expect(result.ok).toBe(false)
    expect(createUser.mock.calls[0]?.[0].app_metadata).toEqual({ panel_role: 'admin' })
    expect(ilike).toHaveBeenCalledWith('username', 'test\\_user')
    expect(deleteUser).toHaveBeenCalledWith('new-only')
  })
  it('rechaza usuario duplicado sin crear identidad', async () => {
    const createUser = vi.fn()
    mocks.service.mockReturnValue({
      from: () => ({ select: () => ({ ilike: () => ({ limit: async () => ({ data: [{ user_id: 'exists' }] }) }) }) }),
      auth: { admin: { createUser } },
    })
    expect((await createPanelAccount(null, form({ username: 'Existing', full_name: 'Ya existe', password: randomUUID() }))).ok).toBe(false)
    expect(createUser).not.toHaveBeenCalled()
  })
})

describe('acceso revocable', () => {
  const otro = '33333333-3333-4333-a333-333333333333'
  /** Devuelve el espía del `update`, que es lo único que esta operación escribe. */
  function cuentaAjena(role: 'admin' | 'moderator') {
    const update = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) })
    const deleteUser = vi.fn()
    mocks.service.mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: otro, username: 'vendedor' } }) }) }),
        update,
      }),
      auth: { admin: { getUserById: async () => ({ data: { user: { app_metadata: { panel_role: role } } } }), deleteUser } },
    })
    return { update, deleteUser }
  }

  it('retira el acceso con una fecha y lo devuelve con null, sin borrar la cuenta', async () => {
    const quitar = cuentaAjena('admin')
    const quitado = await setPanelAccess(null, form({ user_id: otro, intent: 'revoke' }))
    expect(quitado.ok).toBe(true)
    expect(typeof quitar.update.mock.calls[0]?.[0].revoked_at).toBe('string')
    expect(quitar.deleteUser).not.toHaveBeenCalled()

    const devolver = cuentaAjena('admin')
    const devuelto = await setPanelAccess(null, form({ user_id: otro, intent: 'restore' }))
    expect(devuelto.ok).toBe(true)
    expect(devolver.update.mock.calls[0]?.[0]).toEqual({ revoked_at: null })
    expect(devolver.deleteUser).not.toHaveBeenCalled()
  })

  it('el moderador no puede dejarse a sí mismo fuera de su propia tienda', async () => {
    expect((await setPanelAccess(null, form({ user_id: actor.userId, intent: 'revoke' }))).ok).toBe(false)
    expect(mocks.service).not.toHaveBeenCalled()
  })

  it('no permite revocar a otro moderador', async () => {
    const { update } = cuentaAjena('moderator')
    expect((await setPanelAccess(null, form({ user_id: otro, intent: 'revoke' }))).ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it.each(['', 'basura', 'REVOKE'])('exige la intención escrita y no deduce nada: %s', async (intent) => {
    const { update } = cuentaAjena('admin')
    expect((await setPanelAccess(null, form({ user_id: otro, intent }))).ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('el listado informa el estado real de cada cuenta', async () => {
    mocks.service.mockReturnValue({
      from: () => ({ select: () => ({ order: async () => ({ data: [
        { user_id: 'a', username: 'cielo', full_name: 'Cielo', revoked_at: null },
        { user_id: 'b', username: 'vendedor', full_name: 'Vendedor', revoked_at: '2026-09-07T12:00:00.000Z' },
      ] }) }) }),
      auth: { admin: { getUserById: async (id: string) => ({ data: { user: { app_metadata: { panel_role: id === 'a' ? 'moderator' : 'admin' } } } }) } },
    })
    const cuentas = await listPanelAccounts()
    expect(cuentas.map(c => [c.username, c.role, c.revokedAt !== null])).toEqual([
      ['cielo', 'moderator', false],
      ['vendedor', 'admin', true],
    ])
  })
})

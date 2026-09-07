import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ server: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ hasSupabase: true, supabaseServer: mock.server }))
import { emailForUsername, getAdminSession, requireModerator } from '@/lib/admin/auth'

beforeEach(() => { vi.resetAllMocks() })
function setup(metadata: Record<string, unknown>, member = true, revokedAt: string | null = null) {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'validated-id', email: 'test@example.invalid', app_metadata: metadata, user_metadata: { panel_role: 'moderator' } } } })
  mock.server.mockResolvedValue({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: member ? { user_id: 'validated-id', username: 'test', full_name: 'Prueba', revoked_at: revokedAt } : null }) }) }) }),
  })
  return getUser
}

describe('sesión real del panel', () => {
  it('valida Auth y usa solo app_metadata para autorizar', async () => {
    const getUser = setup({})
    const session = await getAdminSession()
    expect(session?.role).toBe('admin')
    await expect(requireModerator()).rejects.toThrow('NO_AUTORIZADO')
    expect(getUser).toHaveBeenCalled()
  })
  it('un rol de moderador no basta sin pertenecer al panel', async () => {
    setup({ panel_role: 'moderator' }, false)
    expect(await getAdminSession()).toBeNull()
    await expect(requireModerator()).rejects.toThrow('NO_AUTORIZADO')
  })
  it('permite al moderador validado con pertenencia vigente', async () => {
    setup({ panel_role: 'moderator' })
    expect((await requireModerator()).userId).toBe('validated-id')
  })
  it('una cuenta con el acceso retirado deja de tener sesión, aunque su clave siga siendo válida', async () => {
    // Auth la sigue reconociendo: lo que caduca es el permiso, no la identidad.
    setup({ panel_role: 'moderator' }, true, '2026-09-07T18:11:05.107+00:00')
    expect(await getAdminSession()).toBeNull()
    await expect(requireModerator()).rejects.toThrow('NO_AUTORIZADO')
  })
  it('normaliza nuevas cuentas sin alterar el alias del titular', () => {
    expect(emailForUsername(' New_User ')).toBe('new_user@users.skyimport.local')
    expect(emailForUsername('cielo')).toBe(emailForUsername('Cielo'))
    expect(emailForUsername('bad/name')).toBeNull()
    expect(emailForUsername('')).toBeNull()
  })
})

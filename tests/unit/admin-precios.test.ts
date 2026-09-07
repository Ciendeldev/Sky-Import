import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), server: vi.fn(), revalidate: vi.fn(), upsert: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/admin/auth', () => ({
  requireAdmin: mocks.requireAdmin, requireModerator: vi.fn(), emailForUsername: () => null,
}))
vi.mock('@/lib/supabase/server', () => ({ hasSupabase: true, supabaseServer: mocks.server }))
import { saveFx } from '@/lib/admin/actions'

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(values)) data.set(k, v)
  return data
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireAdmin.mockResolvedValue({ userId: 'x', role: 'admin' })
  mocks.upsert.mockResolvedValue({ error: null })
  mocks.server.mockResolvedValue({ from: () => ({ upsert: mocks.upsert }) })
})

describe('tasa de cambio', () => {
  // El guaraní se escribe 7.400 y un campo numérico se come el punto: queda 7.
  // Eso ya pasó en producción y dividió por mil el precio de toda la tienda.
  it.each(['7', '7.4', '0.5', '999', '20001', '740000'])('rechaza una tasa imposible de guaraníes: %s', async (pyg) => {
    const r = await saveFx(form({ PYG: pyg, BRL: '5.39' }))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/entre 1000 y 20000/)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it.each(['0.5', '0', '51', '5390'])('rechaza un real imposible: %s', async (brl) => {
    const r = await saveFx(form({ PYG: '7400', BRL: brl }))
    expect(r.ok).toBe(false)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('acepta y guarda una tasa creíble', async () => {
    const r = await saveFx(form({ PYG: '7400', BRL: '5.39', reference: '2026-09' }))
    expect(r.ok).toBe(true)
    expect(mocks.upsert.mock.calls[0]?.[0].value).toMatchObject({ PYG: 7400, BRL: 5.39 })
  })

  it('no deja pasar texto ni vacío', async () => {
    for (const pyg of ['', 'siete mil', 'NaN']) {
      expect((await saveFx(form({ PYG: pyg, BRL: '5.39' }))).ok).toBe(false)
    }
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ server: vi.fn(), write: vi.fn(), admin: vi.fn(), revalidate: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/admin/auth', () => ({ requireAdmin: mocks.admin, requireModerator: mocks.admin, emailForUsername: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ hasSupabase: true, supabaseServer: mocks.server }))
import { saveProduct, saveVariant, saveCoupon, setOrderStatus, deleteOrder } from '@/lib/admin/actions'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.write.mockResolvedValue({ error: null })
  mocks.server.mockResolvedValue({ from: () => ({
    insert: mocks.write,
    update: (payload: unknown) => ({ eq: () => mocks.write(payload) }),
  }), rpc: mocks.write })
})

describe('activar y desactivar desde los formularios del panel', () => {
  const cases = [
    [saveProduct, { slug: 'prueba', ref: 'PRUEBA', name: 'Prueba', price_usd: '10' }],
    [saveVariant, { sku: 'PRUEBA', label_es: 'Prueba', product_id: 'producto' }],
    [saveCoupon, { code: 'PRUEBA', value: '10' }],
  ] as const
  for (const [save, fields] of cases) {
    it.each([true, false])(`${save.name}: respeta activo=%s al crear y al editar`, async (active) => {
      for (const id of ['', 'existente']) {
        const form = new FormData()
        Object.entries(fields).forEach(([key, value]) => form.set(key, value))
        if (id) form.set('id', id)
        if (active) form.set('active', 'on')
        expect((await save(form)).ok).toBe(true)
        expect(mocks.write).toHaveBeenLastCalledWith(expect.objectContaining({ active }))
      }
    })
  }
  it('un error de stock al reabrir no informa éxito ni invalida las páginas', async () => {
    mocks.write.mockResolvedValue({ error: { message: 'Sin stock suficiente' } })
    expect(await setOrderStatus('pedido', 'confirmado')).toEqual({ ok: false, error: 'Sin stock suficiente' })
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
  it('cancelar invalida el catálogo público además del panel', async () => {
    expect((await setOrderStatus('pedido', 'cancelado')).ok).toBe(true)
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout')
  })
  it('borrar un cancelado no anuncia una segunda devolución', async () => {
    mocks.write.mockResolvedValue({ data: { ok: true, number: 'SI-1', restored: 0 }, error: null })
    expect((await deleteOrder('pedido')).message).toContain('0 unidades volvieron')
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout')
  })
})

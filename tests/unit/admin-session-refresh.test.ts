import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { CookieMethodsServer } from '@supabase/ssr'

const mocks = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.create }))
import { proxy } from '@/proxy'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key')
  mocks.create.mockReturnValue({ auth: { getUser: mocks.user } })
})

describe('renovación de sesión del panel', () => {
  it.each(['/admin', '/admin/productos', '/admin/acceso'])('persiste cookies renovadas en %s', async (path) => {
    const request = new NextRequest(`https://sky.test${path}`, { headers: { cookie: 'token=viejo' } })
    mocks.create.mockImplementation((_url, _key, { cookies }: { cookies: CookieMethodsServer }) => ({
      auth: { getUser: async () => {
        expect(cookies.getAll()).toEqual([{ name: 'token', value: 'viejo' }])
        await cookies.setAll!([{ name: 'token', value: 'nuevo', options: { path: '/', httpOnly: true } }], { Pragma: 'no-cache', Expires: '0' })
        return { data: { user: { id: 'validado' } } }
      } },
    }))
    const response = await proxy(request)
    expect(request.cookies.get('token')?.value).toBe('nuevo')
    expect(response.headers.get('x-middleware-request-cookie')).toContain('token=nuevo')
    expect(response.cookies.get('token')?.value).toBe('nuevo')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('pragma')).toBe('no-cache')
  })
  it('sin claves mantiene accesible la pantalla de acceso', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const response = await proxy(new NextRequest('https://sky.test/admin/acceso'))
    expect(response.status).toBe(200)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('no carga autenticación en la tienda pública ni altera su idioma', async () => {
    expect((await proxy(new NextRequest('https://sky.test/es/catalogo'))).status).toBe(200)
    expect((await proxy(new NextRequest('https://sky.test/', { headers: { 'accept-language': 'pt' } }))).headers.get('location')).toBe('https://sky.test/pt')
    expect(mocks.create).not.toHaveBeenCalled()
  })
})

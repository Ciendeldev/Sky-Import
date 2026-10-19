import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

/** El render recibe la cookie renovada y el navegador la conserva para la próxima petición. */
export async function refreshAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  response.headers.set('Cache-Control', 'private, no-store')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        for (const { name, value } of cookies) request.cookies.set(name, value)
        const previous = response.cookies.getAll()
        response = NextResponse.next({ request })
        for (const cookie of previous) response.cookies.set(cookie)
        for (const { name, value, options } of cookies) response.cookies.set(name, value, options)
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value)
        response.headers.set('Cache-Control', 'private, no-store')
      },
    },
  })

  // Renueva antes del render. La pertenencia y revocación siguen comprobándose
  // con getUser + admin_users en el guard; esta capa no concede acceso.
  await supabase.auth.getUser()
  return response
}

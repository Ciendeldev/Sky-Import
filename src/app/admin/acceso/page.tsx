import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/auth'
import { LoginForm } from '@/components/admin/LoginForm'
import { hasSupabase } from '@/lib/supabase/server'

export const metadata = { title: 'Acceso · Panel Sky Import' }

export default async function AccesoPage() {
  // Quien ya tiene sesión no tiene nada que hacer acá.
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-[380px]">
        <p className="a-eyebrow">Sky Import</p>
        <h1 className="a-title mt-3">Panel de administración</h1>
        <p className="mt-3 text-[0.875rem] leading-relaxed text-fg-mid">
          Inventario, precios, cupones y pedidos de la tienda.
        </p>

        {hasSupabase ? (
          <LoginForm />
        ) : (
          <div className="a-note a-note--warn mt-8">
            La tienda todavía no tiene Supabase configurado. Completá{' '}
            <code className="a-num">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code className="a-num">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{' '}
            <code className="a-num">.env.local</code>; están documentadas en{' '}
            <code className="a-num">.env.example</code>.
          </div>
        )}
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/auth'
import { BrandMark } from '@/components/brand/Wordmark'
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
        {/* El sello antes que el título: quien llega acá tiene que reconocer
            de un vistazo que es la trastienda de SU tienda, no un formulario
            de acceso cualquiera al que pudo llegar de rebote. */}
        <div className="flex items-center gap-2.5 text-accent">
          <BrandMark size={30} animate="draw" />
          <span className="font-mono text-[0.8125rem] font-medium tracking-[0.2em]">
            <span className="text-fg">SKY</span> <span className="text-accent">IMPORT</span>
          </span>
        </div>
        <h1 className="a-title mt-6">Panel de administración</h1>
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

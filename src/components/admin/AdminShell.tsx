'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/admin/actions'

/**
 * Armazón del panel: barra lateral en escritorio, tira desplazable en teléfono.
 * La sección activa se marca con `aria-current`, y el filete cian que la señala
 * lo pinta el CSS a partir de ese atributo — no hay una segunda fuente de
 * verdad sobre dónde estás parado.
 */

const SECCIONES = [
  { href: '/admin', label: 'Tablero' },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/cupones', label: 'Cupones' },
  { href: '/admin/precios', label: 'Precios' },
] as const

export function AdminShell({
  username,
  children,
}: {
  username: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="a-shell">
      <aside className="a-side">
        <Link href="/admin" className="flex items-baseline gap-1.5">
          <span className="font-mono text-[0.8125rem] font-medium tracking-[0.2em] text-fg">
            SKY
          </span>
          <span className="font-mono text-[0.8125rem] tracking-[0.2em] text-accent">IMPORT</span>
        </Link>
        <p className="a-eyebrow mt-1">Panel</p>

        <nav className="a-nav mt-5" aria-label="Secciones del panel">
          {SECCIONES.map((s) => {
            // `/admin` solo está activo en sí mismo; el resto también en sus hijos.
            const active = s.href === '/admin' ? pathname === s.href : pathname.startsWith(s.href)
            return (
              <Link key={s.href} href={s.href} aria-current={active ? 'page' : undefined}>
                {s.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 lg:mt-auto lg:pt-6">
          <p className="a-eyebrow">Sesión</p>
          <p className="mt-1 text-[0.8125rem] text-fg">{username}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/es" className="a-btn a-btn--sm" target="_blank" rel="noopener">
              Ver tienda
            </Link>
            <form action={signOut}>
              <button type="submit" className="a-btn a-btn--sm a-btn--danger">
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="a-main">{children}</main>
    </div>
  )
}

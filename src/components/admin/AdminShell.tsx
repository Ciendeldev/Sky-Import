'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandMark } from '@/components/brand/Wordmark'
import { ICONOS, type IconoPanel } from '@/components/admin/AdminIcons'
import { signOut } from '@/lib/admin/actions'

/**
 * Armazón del panel: barra lateral en escritorio, tira desplazable en teléfono.
 * La sección activa se marca con `aria-current`, y el filete cian que la señala
 * lo pinta el CSS a partir de ese atributo — no hay una segunda fuente de
 * verdad sobre dónde estás parado.
 *
 * Lleva el sello de la casa, no solo el nombre en texto. Un panel sin marca
 * parece una plantilla comprada; con ella, parece parte de la tienda. Y el
 * icono por sección no es adorno: en una barra de cinco entradas iguales, la
 * forma se reconoce antes que la palabra, y el operador deja de leer para
 * empezar a apuntar.
 */

const SECCIONES = [
  { href: '/admin', label: 'Tablero', icono: 'tablero' },
  { href: '/admin/productos', label: 'Productos', icono: 'productos' },
  { href: '/admin/pedidos', label: 'Pedidos', icono: 'pedidos' },
  { href: '/admin/cupones', label: 'Cupones', icono: 'cupones' },
  { href: '/admin/precios', label: 'Precios', icono: 'precios' },
  { href: '/admin/configuracion', label: 'Configuración', icono: 'configuracion' },
] as const satisfies readonly { href: string; label: string; icono: IconoPanel }[]

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
        <Link href="/admin" className="a-brand">
          <BrandMark size={26} animate="hover" className="a-brand__mark" />
          <span className="a-brand__text">
            <span className="a-brand__name">
              <span className="text-fg">SKY</span> <span className="text-accent">IMPORT</span>
            </span>
            <span className="a-brand__role">Panel</span>
          </span>
        </Link>

        <nav className="a-nav mt-6" aria-label="Secciones del panel">
          {SECCIONES.map((s) => {
            // `/admin` solo está activo en sí mismo; el resto también en sus hijos.
            const active = s.href === '/admin' ? pathname === s.href : pathname.startsWith(s.href)
            const Icono = ICONOS[s.icono]
            return (
              <Link key={s.href} href={s.href} aria-current={active ? 'page' : undefined}>
                <Icono />
                {s.label}
              </Link>
            )
          })}
        </nav>

        <div className="a-session mt-6 lg:mt-auto">
          <p className="a-eyebrow">Sesión</p>
          <p className="a-session__user">{username}</p>

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

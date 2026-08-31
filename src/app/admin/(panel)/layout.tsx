import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/auth'
import { AdminShell } from '@/components/admin/AdminShell'

/**
 * GUARD DE TODO EL PANEL
 *
 * Un solo sitio donde se comprueba la sesión, en vez de una comprobación por
 * página que alguien se olvide de copiar en la siguiente. Las rutas de este
 * grupo no existen sin sesión: quien no la tenga acaba en la pantalla de acceso
 * antes de que se renderice nada.
 *
 * No es la única defensa: las políticas RLS de la base niegan la escritura
 * aunque alguien llegara acá de otro modo. Esta capa evita la pantalla, no los
 * datos.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/acceso')

  return <AdminShell username={session.username}>{children}</AdminShell>
}

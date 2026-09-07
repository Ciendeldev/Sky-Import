import { getAdminSession } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'
import { listPanelAccounts } from '@/lib/admin/account-actions'
import { OwnPasswordForm, UserManagement, AccountSectionTitle } from '@/components/admin/AccountSettings'

export const metadata = { title: 'Configuración · Panel Sky Import' }

export default async function ConfigurationPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/acceso')
  const moderator = session.role === 'moderator'
  // El fallo se registra antes de tragárselo. Sin esto, «no se pudieron cargar
  // los usuarios» es un callejón sin salida: no queda rastro de si faltó la
  // clave de servicio, si cayó la red o si Auth no devolvió a alguien.
  const accounts = moderator
    ? await listPanelAccounts().catch((e: unknown) => {
        console.error('[configuracion] listPanelAccounts falló:', e)
        return null
      })
    : null
  return <div className="a-settings">
    <header className="a-settings-intro">
      <div><p className="a-eyebrow">Sky Import · Panel</p><h1 className="a-title mt-2">Configuración</h1></div>
      <span className="a-tag">{moderator ? 'Moderador' : 'Administrador'}</span>
    </header>
    <section className="a-panel a-account-section" aria-label="Mi cuenta">
      <AccountSectionTitle title="Mi cuenta" type="profile" />
      <dl className="a-account-body a-grid a-grid--3 a-account-profile">
        <div><dt className="a-label">Usuario</dt><dd className="a-num">{session.username}</dd></div>
        <div><dt className="a-label">Nombre completo</dt><dd>{session.fullName ?? session.username}</dd></div>
        <div><dt className="a-label">Rol</dt><dd>{moderator ? 'Moderador' : 'Administrador'}</dd></div>
      </dl>
    </section>
    <OwnPasswordForm />
    {moderator && (accounts ? <UserManagement accounts={accounts} currentUserId={session.userId} /> :
      <p className="a-note a-note--error" role="alert">No se pudieron cargar los usuarios. Volvé a intentar en unos minutos.</p>)}
  </div>
}

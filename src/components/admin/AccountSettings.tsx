'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { changeOwnPassword, createPanelAccount, resetPanelPassword } from '@/lib/admin/account-actions'
import type { PanelAccount } from '@/lib/admin/account-policy'
import type { ActionResult } from '@/lib/admin/actions'

type AccountAction = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>

function Submit({ children, busy }: { children: React.ReactNode; busy: string }) {
  const { pending } = useFormStatus()
  return <button className="a-btn a-btn--solid" type="submit" disabled={pending}>{pending ? busy : children}</button>
}

function AccountForm({ action, children, label }: { action: AccountAction; children: React.ReactNode; label: string }) {
  const [state, formAction] = useActionState(action, null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) form.current?.reset() }, [state])
  return (
    <form ref={form} action={formAction} aria-label={label}>
      {children}
      {state && <p className={'a-note mt-4 ' + (state.ok ? 'a-note--ok' : 'a-note--error')} role={state.ok ? 'status' : 'alert'}>{state.message ?? state.error}</p>}
    </form>
  )
}

function PasswordField({ id, name, label, current = false }: { id: string; name: string; label: string; current?: boolean }) {
  return <div>
    <label className="a-label" htmlFor={id}>{label}</label>
    <input id={id} name={name} type="password" className="a-field" autoComplete={current ? 'current-password' : 'new-password'} minLength={current ? undefined : 12} maxLength={128} required />
  </div>
}

export function AccountSectionTitle({ title, type, count }: { title: string; type: 'lock' | 'users' | 'profile'; count?: number }) {
  return <header className="a-account-heading">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {type === 'lock' ? <><rect x="5" y="10" width="14" height="11" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></> :
        <><circle cx="10" cy="7" r="3" /><path d="M4 21v-3a6 6 0 0 1 12 0v3" />{type === 'users' && <path d="M17 4a3 3 0 0 1 0 6M20 21v-3a6 6 0 0 0-3-5" />}</>}
    </svg>
    <h2>{title}</h2>
    {count !== undefined && <span className="a-account-count a-num">{count}</span>}
  </header>
}

export function OwnPasswordForm() {
  return <section className="a-panel a-account-section" aria-label="Cambiar contraseña">
    <AccountSectionTitle title="Cambiar contraseña" type="lock" />
    <div className="a-account-body">
      <AccountForm action={changeOwnPassword} label="Cambiar mi contraseña">
        <div className="a-grid a-grid--3">
          <PasswordField id="current-password" name="current_password" label="Contraseña actual" current />
          <PasswordField id="new-password" name="new_password" label="Nueva contraseña" />
          <PasswordField id="confirm-password" name="confirm_password" label="Repetir contraseña" />
        </div>
        <div className="a-account-footer">
          <p className="a-hint">Usá una frase de 12 caracteres o más que no uses en otro sitio.</p>
          <Submit busy="Cambiando…">Cambiar contraseña</Submit>
        </div>
      </AccountForm>
    </div>
  </section>
}

export function UserManagement({ accounts, currentUserId }: { accounts: PanelAccount[]; currentUserId: string }) {
  const [resetTarget, setResetTarget] = useState<PanelAccount | null>(null)
  return <section className="a-panel a-account-section" aria-label="Gestión de usuarios">
    <AccountSectionTitle title="Gestión de usuarios" type="users" count={accounts.length} />
    <p className="a-hint a-users-scroll-hint">Deslizá la tabla para ver roles y acciones.</p>
    <div className="a-scroll">
      <table className="a-table a-users-table">
        <caption className="sr-only">Usuarios con acceso al panel</caption>
        <thead><tr><th scope="col">Usuario</th><th scope="col">Nombre completo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
        <tbody>{accounts.map(account => <tr key={account.userId}>
          <td className="a-num">{account.username}{account.userId === currentUserId && <span className="a-hint"> · Vos</span>}</td>
          <td>{account.fullName ?? '—'}</td>
          <td>{account.role === 'moderator' ? 'Moderador' : 'Administrador'}</td>
          <td><span className="a-tag a-tag--ok">Activo</span></td>
          <td>{account.role === 'admin' && account.userId !== currentUserId
            ? <button type="button" className="a-btn" onClick={() => setResetTarget(account)} aria-label={'Restablecer contraseña de ' + account.username} aria-expanded={resetTarget?.userId === account.userId}>Restablecer clave</button>
            : <span className="a-hint">—</span>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {resetTarget && <div className="a-account-body a-account-divider" key={resetTarget.userId}>
      <h3 className="a-account-subtitle">Restablecer contraseña de {resetTarget.username}</h3>
      <AccountForm action={resetPanelPassword} label={'Restablecer contraseña de ' + resetTarget.username}>
        <input type="hidden" name="user_id" value={resetTarget.userId} />
        <div className="a-grid a-grid--2">
          <PasswordField id="reset-password" name="new_password" label="Nueva contraseña" />
          <PasswordField id="reset-confirm" name="confirm_password" label="Repetir contraseña" />
        </div>
        <div className="a-account-footer">
          <p className="a-hint">La contraseña anterior dejará de servir para iniciar sesión.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="a-btn" onClick={() => setResetTarget(null)}>Cerrar</button>
            <Submit busy="Restableciendo…">Restablecer contraseña</Submit>
          </div>
        </div>
      </AccountForm>
    </div>}
    <div className="a-account-body a-account-divider">
      <h3 className="a-account-subtitle">Crear usuario</h3>
      <AccountForm action={createPanelAccount} label="Crear administrador">
        <div className="a-grid a-account-create">
          <div><label className="a-label" htmlFor="account-username">Usuario</label><input id="account-username" name="username" className="a-field" autoComplete="off" autoCapitalize="none" spellCheck={false} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}" minLength={3} maxLength={32} required /></div>
          <div><label className="a-label" htmlFor="account-name">Nombre completo</label><input id="account-name" name="full_name" className="a-field" autoComplete="off" maxLength={100} required /></div>
          <PasswordField id="account-password" name="password" label="Contraseña" />
          <div><label className="a-label" htmlFor="account-role">Rol</label><select id="account-role" className="a-field" disabled defaultValue="admin"><option value="admin">Administrador</option></select></div>
        </div>
        <div className="a-account-footer">
          <p className="a-hint">Solo el moderador crea usuarios y restablece contraseñas. Las nuevas cuentas administran la tienda.</p>
          <Submit busy="Creando…"><span aria-hidden="true">＋</span> Crear usuario</Submit>
        </div>
      </AccountForm>
    </div>
  </section>
}

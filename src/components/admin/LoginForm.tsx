'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn, type ActionResult } from '@/lib/admin/actions'

/**
 * El formulario pide USUARIO, no correo. El correo con el que existe la cuenta
 * en Supabase Auth es un detalle interno que el operador no tiene por qué saber
 * ni escribir; la traducción se hace en el servidor.
 *
 * El estado de envío sale de `useFormStatus`, que lee el del formulario padre:
 * así el botón se bloquea solo, sin un `useState` que se pueda desincronizar.
 */

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="a-btn a-btn--solid mt-6 w-full" disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(signIn, null)

  return (
    <form action={formAction} className="mt-8">
      <div>
        <label className="a-label" htmlFor="username">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          type="text"
          className="a-field"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
      </div>

      <div className="mt-4">
        <label className="a-label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="a-field"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error ? (
        <p className="a-note a-note--error mt-5" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="a-hint mt-5">
        Si perdiste el acceso, pedile al moderador que restablezca tu contraseña.
      </p>
    </form>
  )
}

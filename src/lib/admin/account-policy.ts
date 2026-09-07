export type PanelRole = 'moderator' | 'admin'

/** Solo app_metadata, que Supabase reserva al servidor, puede otorgar permisos. */
export function panelRole(metadata: Record<string, unknown> | undefined): PanelRole {
  return metadata?.panel_role === 'moderator' ? 'moderator' : 'admin'
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/

export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 12 || password.length > 128) return 'Usá entre 12 y 128 caracteres para la nueva contraseña.'
  if (password !== confirmation) return 'Las contraseñas no coinciden.'
  return null
}

export interface PanelAccount {
  userId: string
  username: string
  fullName: string | null
  role: PanelRole
}

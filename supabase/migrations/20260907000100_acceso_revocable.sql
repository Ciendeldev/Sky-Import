-- ═══════════════════════════════════════════════════════════════════════════
-- EL ACCESO SE RETIRA, NO SE BORRA
--
-- El panel sabía dar de alta un administrador y no sabía darlo de baja. Para
-- una tienda con empleados eso no alcanza: el día que alguien deja de trabajar
-- hay que poder cortarle el acceso desde el panel, sin entrar a la base a mano.
--
-- Se revoca en vez de borrar por dos razones. Un `delete` sobre `admin_users`
-- se lleva puesto el rastro de quién administraba cuando pasó cada cosa, y es
-- irreversible por definición: si el moderador se equivoca de fila, no hay
-- vuelta atrás. Una fecha se pone y se saca.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.admin_users
  add column if not exists revoked_at timestamptz;

comment on column public.admin_users.revoked_at is
  'Momento en que se le retiró el acceso al panel. NULL = activo. Se revoca en vez de borrar la fila para conservar el rastro de quién administró.';

-- `is_admin()` es la que consultan TODAS las políticas RLS de escritura, así
-- que la revocación tiene que entrar acá y no solo en el guard de la
-- aplicación. Si mirara únicamente la pertenencia a la tabla, una cuenta
-- revocada seguiría escribiendo en la base mientras le durara el token que ya
-- tiene en el navegador, aunque el panel no la dejara ver ni una pantalla.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
      and a.revoked_at is null
  );
$$;

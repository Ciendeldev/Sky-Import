# ADR 010 — Cuentas del panel y moderación

Fecha: 2026-09-07. Estado: adoptada por solicitud del titular.

## Decisión
Configuración conserva la distribución de las referencias: cuenta, cambio de
contraseña y gestión de usuarios. No incorpora campos del sistema de auditoría.

La pertenencia a `admin_users` continúa siendo la puerta del panel y de RLS.
El privilegio adicional de moderador vive en `auth.users.app_metadata.panel_role`,
que solo puede modificar Supabase Admin. Nunca se confía en `user_metadata`,
campos del formulario ni en decodificar un JWT sin validarlo: el guard consulta
`getUser()` y la fila de pertenencia. Sin un rol reconocido se es administrador,
nunca moderador. No se amplían las políticas de escritura ni se necesita cambiar
el esquema SQL.

La cuenta existente Cielo conserva ID, correo y contraseña. El despliegue asigna
el rol de moderador a su ID comprobado, preservando los otros app_metadata.
Crear usuarios y restablecer claves ajenas requiere ese rol en cada acción del
servidor. Las nuevas cuentas siempre son administradores; el formulario no puede
crear más moderadores. No hay borrado, suspensión ni edición de roles en la UI.

Los nuevos usuarios se normalizan a minúsculas y usan correo interno determinista
`usuario@users.skyimport.local`. No se envían correos. Supabase Auth garantiza
unicidad incluso con altas simultáneas; se verifica además el nombre existente
escapando comodines SQL. Si insertar la pertenencia falla, se elimina únicamente
la identidad Auth recién creada por esa llamada.

## Contraseñas
Los campos son ocultos y no se incluyen en respuestas ni registros. Las claves
nuevas tienen entre 12 y 128 caracteres. Cambiar la propia requiere contraseña
actual, nueva y repetición. Se comprueba la actual en un cliente aislado sin
cookies, se verifica el mismo ID y se cierra esa sesión temporal. Un moderador
puede restablecer solo otras cuentas administradoras, nunca su propia clave ni
la de otro moderador mediante esa acción.

## Verificación
Pruebas de denegación directa sin sesión y con administrador; metadatos de usuario
sin privilegio; claves incorrectas; duplicados; compensación de alta fallida.
Las pruebas integradas de cuentas son optativas, crean identidades temporales y
las eliminan por ID exacto en finally. Contraseñas aleatorias solo en memoria,
sin trazas ni video. No se cambia ninguna clave del titular.

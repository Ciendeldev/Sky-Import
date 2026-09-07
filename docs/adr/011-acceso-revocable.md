# ADR 011 — El acceso al panel se retira, no se borra

Fecha: 2026-09-07. Estado: adoptada por pedido del titular.
Modifica el ADR 010, que cerraba con «No hay borrado, suspensión ni edición de
roles en la UI».

## Contexto
El ADR 010 dejó el panel sabiendo dar de alta administradores y sin saber darlos
de baja. Para una tienda con empleados esa mitad no alcanza: el día que alguien
deja el local, el moderador se queda sin forma de cortarle la entrada salvo
pidiendo ayuda o entrando a la base a mano.

La columna «Estado» de la tabla de usuarios agravaba el problema, porque decía
«Activo» en texto fijo: no consultaba nada, así que afirmaba algo que el sistema
no estaba en condiciones de saber.

## Decisión
Se agrega `admin_users.revoked_at timestamptz`. `NULL` es activo; una fecha es
acceso retirado. La acción `setPanelAccess` la escribe y la borra, y solo un
moderador puede invocarla.

No se borra la cuenta. Un `delete` sobre `admin_users` se lleva puesto el rastro
de quién administraba cuando pasó cada cosa, y es irreversible por definición: si
el moderador se equivoca de fila, no hay vuelta atrás. Una fecha se pone y se
saca, y la persona vuelve a entrar con la contraseña que ya tenía.

## La revocación entra en la base, no solo en la aplicación
`is_admin()` —la función que consultan **todas** las políticas RLS de escritura—
pasa a exigir `revoked_at is null`. Sin ese cambio, la revocación sería solo un
cartel: la cuenta no vería una sola pantalla del panel, pero el token que ya
tiene en el navegador seguiría escribiendo en la base hasta caducar.

El guard de la aplicación la rechaza además en cada petición, así que el corte es
inmediato y no depende de que expire ninguna sesión.

## Límites
Nadie se revoca a sí mismo: el moderador quedaría fuera de su propia tienda y no
existe nadie con permiso para devolverle la entrada. Ningún moderador puede ser
revocado desde el panel, por la misma razón que ya no podía ser restablecido.

La intención viaja escrita (`revoke` / `restore`) y cualquier otro valor se
rechaza. Deducirla por descarte haría que un campo vacío o mal escrito ejecutara
siempre una de las dos ramas por accidente.

## Verificación
Pruebas unitarias: retiro que escribe fecha y devolución que escribe `null`, sin
que se llame nunca a `deleteUser`; negativa a autorrevocarse; negativa a revocar
a otro moderador; rechazo de intenciones vacías, inventadas y con mayúsculas
distintas; y el listado informando el estado real de cada cuenta.

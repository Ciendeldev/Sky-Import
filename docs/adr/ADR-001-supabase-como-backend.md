# ADR-001: Supabase como backend de la tienda

**Fecha:** 2026-08-31   **Estado:** aceptada

## Contexto

El proyecto nació sin backend, sin base de datos y sin autenticación, y eso
estaba documentado como decisión de diseño: «no existe una sola petición de red
de escritura en todo el proyecto», con una prueba end-to-end que lo verificaba.

El pedido de negocio cambió esa premisa: hace falta un panel de administración
con CRUD de productos, control de stock, cupones de descuento y registro de
pedidos. Ninguna de las cuatro cosas es posible sin persistencia compartida
entre visitantes, y el despliegue es Vercel, cuyo sistema de archivos es
efímero: un JSON en disco no sobrevive a un deploy.

## Decisión

Supabase (Postgres gestionado + Auth + Row Level Security) como única fuente de
datos operativos. El catálogo tipado de `src/lib/catalog/products.ts` se
conserva como semilla y como respaldo mientras no haya claves configuradas.

La seguridad se apoya en **RLS, no en el código de la aplicación**:

- Catálogo, categorías y zonas de envío: lectura pública solo de lo activo.
- Cupones: sin política de lectura. Se validan con `validate_coupon`, una
  función `security definer` que devuelve el descuento ya calculado y nunca la
  lista de códigos.
- Pedidos: se crean con `place_order`, que **relee los precios del catálogo**.
  El cliente manda qué pide, no cuánto cuesta.

## Motivo

Postgres con RLS permite que la regla de seguridad viva en la base y no solo en
el código: aunque alguien encontrara una ruta sin guard, la base le niega la
escritura. Ninguna alternativa de las evaluadas ofrece eso sin escribir un
backend entero.

Frente a Neon + Drizzle: Supabase trae además Auth y Realtime, que el panel
necesita, y evita construir sesiones a mano. Frente a Turso/SQLite: la
concurrencia de escrituras de un checkout con descuento de stock se sirve mejor
en Postgres.

## Consecuencias

- El proyecto deja de ser desplegable sin configuración. Mitigación: toda la
  capa de datos degrada a la fuente estática cuando faltan las claves, así que
  la tienda sigue navegable y vendiendo por WhatsApp sin Supabase.
- La ficha de producto pasa de estática pura a estática con revalidación de 60 s,
  para que un cambio de stock aparezca sin volver a desplegar.
- La prueba «no hay ninguna petición de escritura» deja de tener sentido y se
  retira. La reemplaza una que verifica el contenido del mensaje de WhatsApp.
- Aparece una dependencia de un servicio de terceros con su propio SLA.

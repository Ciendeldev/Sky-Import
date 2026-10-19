# Integridad del pedido y sesión del panel

Fecha: 2026-10-19.

Los formularios interpretan una casilla ausente como desmarcada. Una consulta
exitosa con cero productos activos publica un catálogo vacío: no repone la
semilla. Sin Supabase o con error de consulta se conserva el respaldo.

La selección de variantes tiene una sola fuente en ProductView. Una combinación
inexistente no ofrece compra directa, carrito ni barra de compra móvil. La base
también rechaza pedidos sin variante si existen variantes activas; el checkout
trata ese rechazo como un bloqueo comercial.

## Inventario

El catálogo, el listado administrativo y las alertas comparten `availableUnits`:
si existen variantes activas, suman sus unidades; de lo contrario, usan el stock
base. Al reabrir un pedido con variantes, la base valida cada variante y no
rechaza la operación por un contador agregado que haya quedado desactualizado.

`orders.stock_released` registra si ya se devolvieron las unidades. Un disparador
ejecuta en la misma transacción la cancelación y la restitución de producto y
variante. Repetir la cancelación o borrar después no repone dos veces. Reabrir
verifica stock y vuelve a reservar; si falta, revierte toda la operación. Borrar
un pendiente sigue devolviendo sus unidades, incluso mediante SQL directo.

Un entregado no puede volver a otro estado: cancelar una entrega no demuestra
una devolución física. El borrado de un entregado conserva el stock. No se
introduce un flujo de devoluciones en esta corrección.

La migración no altera los saldos históricos. Los cancelados antiguos conservan
`stock_released=false`: volver a cancelar o borrarlos devuelve su reserva una
sola vez. Revisar manualmente los casos antiguos que hayan pasado por entregado,
porque el esquema anterior no guardaba historial de transiciones.

## Cupones y sesión

`place_order` bloquea la fila del cupón antes de validar y consumir su contador.
El segundo pedido concurrente relee el contador después de esperar. Los
productos se bloquean en orden estable por slug para reducir interbloqueos.

El proxy renueva la sesión solo en `/admin` y sus subrutas. Copia cookies a la
petición y la respuesta y propaga las cabeceras anticaché de Supabase SSR. El
guard conserva `getUser` y la comprobación de revocación en `admin_users`.

## Aplicación y pruebas

Aplicar `20261019141606_integridad_pedidos_cupones.sql` antes de desplegar el
código. No se reescriben migraciones anteriores. El cambio es compatible con
clientes existentes; los tipos incluyen la nueva columna.

`npm run verify` comprueba lint, tipos, unitarias y build. Para PostgreSQL real
y efímero, sin acceso a `.env.local` ni a bases remotas:

```powershell
npm install --prefix tmp/pg-review --no-audit --no-fund embedded-postgres@17.6.0-beta.15 pg
node tests/database/pedidos.mjs
```

El test crea un clúster aislado en `tmp/pg-review/cluster-*`, escucha solo en
127.0.0.1:55439 y lo detiene al terminar. Conserva el directorio para diagnóstico.
Incluye dos conexiones concurrentes que esperan realmente por el mismo cupón.

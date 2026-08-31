# ADR-002: WhatsApp como único cierre de venta

**Fecha:** 2026-08-31   **Estado:** aceptada

## Contexto

El checkout anterior tenía tres pasos, un selector de métodos de pago
(transferencia, efectivo, tarjeta en el local) y terminaba en una pantalla que
declaraba que la experiencia era demostrativa.

En el comercio real de Ciudad del Este la venta se cierra por WhatsApp: ahí se
confirma disponibilidad, se acuerda el pago y se coordina la entrega. El
selector de métodos de pago en la web era una promesa que la operación no
cumplía.

## Decisión

Una sola pantalla de checkout que reúne lo que el mensaje necesita —nombre,
apellido, teléfono, zona, dirección, notas y cupón— y un único botón que
registra el pedido y abre WhatsApp con todo escrito.

Se elimina el selector de métodos de pago, la opción «Tarjeta en el local» y
toda mención al carácter demostrativo del proyecto.

El pedido se registra en la base **antes** de abrir la conversación, con estado
`iniciado_whatsapp`: así queda constancia comercial aunque el cliente no llegue a
enviar el mensaje.

## Motivo

Un checkout con métodos de pago que no cobran es peor que no tenerlo: fija una
expectativa que la operación va a desmentir en el primer mensaje.

## Consecuencias

- Los importes del mensaje van en guaraníes, que es la moneda en la que se
  cierra, aunque la tienda esté mostrando dólares o reales.
- El registro del pedido descuenta stock en la misma transacción. Un pedido que
  no se concreta hay que cancelarlo desde el panel para devolver las unidades.
  Es un trabajo manual conocido y aceptado.
- La tienda pasa a indexarse. El `noindex` queda solo en `/admin`.

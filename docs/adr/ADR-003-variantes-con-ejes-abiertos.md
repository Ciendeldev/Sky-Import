# ADR-003: Variantes con ejes abiertos, no tono/talla/color

**Fecha:** 2026-08-31   **Estado:** aceptada

## Contexto

El pedido original hablaba de «variantes de tono/talla/color», que son los ejes
de una tienda de cosmética o indumentaria. Este catálogo son componentes de PC:
tarjetas gráficas, procesadores, memorias, gabinetes.

## Decisión

Cada variante guarda sus ejes en un `jsonb` (`attributes`), y cada producto
declara los suyos. En componentes de PC eso es capacidad, velocidad, formato,
longitud de radiador o color del gabinete.

El selector de la ficha **deriva los ejes de las propias variantes** en lugar de
declararlos aparte.

## Motivo

Tres columnas fijas `tono`, `talla` y `color` quedarían vacías para la práctica
totalidad del catálogo, y ninguna de las tres describe lo que de verdad
distingue a un SSD de 1 TB de uno de 2 TB.

Derivar los ejes de las variantes hace imposible que exista un eje declarado que
ninguna pieza use.

## Consecuencias

- El panel ofrece una lista de ejes sugeridos (`Capacidad`, `Color`,
  `Velocidad`, `Formato`…) para no escribirlos a mano cada vez, pero acepta
  cualquiera.
- Con variantes activas, el stock del producto pasa a ser la suma de las
  variantes: el número del producto base deja de mandar.
- Si mañana el catálogo cambia de rubro, el modelo sirve igual sin migración.

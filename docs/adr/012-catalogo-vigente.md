# ADR 012 — La vitrina publica lo que cobra la base

Fecha: 2026-09-14. Estado: adoptada.
Completa el ADR-001, que decidía «Supabase como única fuente de datos
operativos» y dejaba el archivo del catálogo «como semilla y como respaldo».

## Contexto
El ADR-001 se cumplió a medias. El panel escribía precios, unidades, tipo de
cambio y umbral de stock en la base, y `place_order` cobraba desde la base.
Pero la vitrina nunca leyó la base: todo componente importaba `products.ts` y
`FX` directamente. El resultado eran dos precios para la misma pieza:

- el operador cambiaba un precio en el panel y la web seguía mostrando el viejo;
- el cliente veía un importe, el pedido se grababa con otro y el mensaje de
  WhatsApp repetía el de la pantalla;
- una pieza desactivada seguía a la venta en la web y la base la rechazaba al
  registrar;
- una pieza creada desde el panel no aparecía en ningún lado;
- la tasa ya se había desalineado sin que nadie lo notara: 5,39 reales en la
  base y 5,4 en el archivo.

Los dos orígenes coincidían solo porque se alinearon a mano el 2026-09-09.

## Decisión
**El layout de la tienda lee una foto del catálogo en el servidor y la reparte
por contexto.** `src/lib/catalog/source.ts` consulta la base con la clave
anónima y sin cookies —productos activos y las claves públicas de `settings`—,
y `CatalogProvider` la baja al navegador. Ningún componente de cliente importa
ya `products.ts` ni `FX`.

La precedencia campo por campo vive en `src/lib/catalog/fromRows.ts`:

| Dato | Manda | Por qué |
|---|---|---|
| Precio, precio anterior, unidades | Base | Es lo que el panel edita y lo que `place_order` cobra. |
| Nombre, código, marca, modelo, categoría, descripción, destacado | Base | El panel los edita. |
| Tasa de cambio y umbral de últimas unidades | Base | El panel los edita; `place_order` graba la tasa. |
| Especificaciones, compatibilidad, dibujo | Archivo, si la pieza está ahí | El panel no los edita. La copia de la base es la de la importación, y una corrección en `products.ts` tiene que llegar al configurador sin reimportar. |
| Qué piezas existen | Base | Una desactivada no se publica; una nueva sí. |

Toda la tienda pasa a revalidarse cada 60 segundos, como ya lo hacía la ficha,
y el panel sigue forzando la regeneración al guardar.

`convert` y `formatMoney` reciben la tasa como parámetro **obligatorio**. Mientras
fue una constante importada, olvidarse de la tasa vigente compilaba sin aviso.

## El mensaje copia el pedido
Aun con la vitrina al día, un cliente puede tener el checkout abierto cuando el
operador cambia un precio. `place_order` devuelve ahora las líneas tal como las
grabó (migración `20260914000100_pedido_devuelve_lineas.sql`), y el mensaje de
WhatsApp se escribe con esas líneas, esos totales y esa tasa. Sin registro —base
caída— el mensaje usa la página, que es la única referencia que queda.

## Respaldo
Si faltan las claves, la consulta falla o la base no devuelve ningún producto,
la foto sale del archivo entero. La tienda pierde frescura, no la venta: el
cierre por WhatsApp funciona igual.

## Consecuencias
- Una pieza creada desde el panel se vende, pero sin ficha técnica entra como
  accesorio con el dibujo de su categoría y no aparece en el configurador hasta
  que se le declare compatibilidad en el archivo.
- La ficha de producto admite slugs que no existían al compilar
  (`dynamicParams = true`); uno que no está en la base responde 404.
- El catálogo viaja dentro del HTML en lugar de dentro del JavaScript. El
  presupuesto de `size-limit` no crece.
- El precio y el stock que figuran en `products.ts` dejan de ser los publicados
  cuando hay base: son la semilla de «Importar catálogo» y el respaldo.

## Avisos del revisor de seguridad de Supabase que se mantienen
Se corrigió el único que no era una decisión: `touch_updated_at` sin
`search_path` fijo (migración `20260914000200_search_path_fijo.sql`). Los demás
se quedan, y conviene dejar escrito por qué:

- `place_order` y `validate_coupon` ejecutables por `anon`: el cliente compra sin
  cuenta. Las dos validan todo por dentro y ninguna devuelve datos ajenos.
- `delete_order` ejecutable por `authenticated`: la función rechaza a quien no
  sea moderador (ADR 011 y `20260907000200_borrar_pedido.sql`).
- `is_admin()` e `is_moderator()` ejecutables por `anon`: **no se pueden
  revocar**. Las políticas de lectura pública se combinan con `is_admin()`, y
  Postgres evalúa esa función con el rol de quien consulta. Sin permiso de
  ejecución, la tienda dejaría de poder leer el catálogo. Para `anon` las dos
  devuelven `false`.
- Protección contra contraseñas filtradas: es un ajuste del proyecto en el
  panel de Supabase, no del código.

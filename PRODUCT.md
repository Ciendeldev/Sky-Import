# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Comprador paraguayo de Ciudad del Este y alrededores.** Llega con una pieza concreta
en la cabeza («necesito una placa de video que entre en mi gabinete») o con un
presupuesto y ninguna certeza. Compra desde el teléfono, muchas veces con datos
móviles, y cierra la conversación por WhatsApp. Quiere saber si la pieza **entra,
alimenta y encaja** antes de preguntar el precio.

**Comprador brasileño de frontera (Foz do Iguaçu y región).** Cruza a Ciudad del Este
específicamente porque el hardware importado es más barato que en Brasil. Llega en
portugués, razona en reales, y compara contra el precio brasileño antes de moverse.
Necesita ver el precio en su moneda sin convertir mentalmente, y necesita entender la
ficha técnica sin traductor.

**Armador / actualizador.** Ya tiene un equipo y cambia una pieza por vez. Su pregunta
no es «cuál es la mejor» sino «cuál es compatible con lo que ya tengo». Es el usuario
que más veces vuelve.

## Product Purpose

Sky Import vende componentes para montar, mejorar y personalizar computadoras. La tienda
existe para que la decisión de compra se pueda tomar **sin adivinar**: cada pieza llega
con su ficha, su compatibilidad declarada y su precio en la moneda del que mira.

Éxito = el visitante sabe si la pieza le sirve antes de escribir a nadie, y llega al
carrito o al WhatsApp con el modelo exacto ya decidido.

## Positioning

Una tienda de importación de frontera que publica **la ficha técnica antes que la
promesa comercial**. El diferencial no es el catálogo (cualquiera lista una RTX): es que
socket, generación de RAM, vataje y longitud física están declarados como datos de
primera clase, comprobables en el configurador, en tres monedas y dos idiomas.

## Operating Context

- Ciudad del Este, Alto Paraná, Paraguay. Zona comercial de frontera con Brasil y Argentina.
- El canal de cierre real es **WhatsApp**, no un formulario. El teléfono es el dispositivo principal.
- Dos idiomas públicos: **español** (por defecto) y **portugués de Brasil**.
- Tres monedas visibles: **USD** (fuente de verdad), **PYG** y **BRL** (ambas derivadas y referenciales).
- El visitante compara contra el precio del otro lado de la frontera antes de decidir.

## Capabilities and Constraints

**Confirmado**

- Catálogo público leído desde Supabase, con semilla tipada y respaldo local.
- Panel autenticado con perfiles de administrador y moderador, políticas RLS y acceso revocable.
- Categorías: tarjetas gráficas, procesadores, memorias RAM, placas madre, almacenamiento,
  fuentes de alimentación, refrigeración, gabinetes, accesorios de armado.
- Carrito persistido en `localStorage`. El checkout registra pedidos, relee precios y reserva existencias en PostgreSQL.
- Configurador «Arma tu PC» con comprobaciones fundamentales: socket CPU/placa,
  generación DDR, vataje recomendado según GPU, longitud de GPU contra gabinete.
- Contacto configurado: WhatsApp **+595 994 222 542**, centralizado en `src/config/site.ts`.
- El cierre se coordina por WhatsApp. El registro no acredita pago ni envío del mensaje.
- La compra directa no crea pedido; un fallo técnico puede permitir continuar sin registro.
  Stock insuficiente, producto no disponible o variante inválida bloquean el checkout.
- Cupones, variantes, tasa de cambio, existencias y seguimiento se administran desde el panel.

**Restricciones duras**

- Las páginas públicas permiten indexación; el panel, el carrito y el checkout quedan excluidos.
- El tipo de cambio es **referencial y configurable** desde el panel. Nunca se presenta
  como cotización en vivo. Los pedidos conservan la tasa y los importes del registro.
- No hay pasarela de pago, conciliación bancaria, facturación fiscal ni seguimiento logístico.
- Las cantidades almacenadas no prueban por sí solas las existencias físicas del comercio.
- Cancelar devuelve la reserva una sola vez; reabrir exige stock. Borrar no vuelve a
  restituir un pedido cancelado y no repone un entregado. Requiere la migración de integridad.

**Terminología del rubro que la interfaz debe usar bien**

Socket (AM5 / LGA1851 / LGA1700), chipset, DDR5, perfil EXPO/XMP, TDP, TGP, vataje
recomendado, longitud de GPU en mm, altura máxima de disipador, formato ATX / Micro-ATX /
Mini-ITX, PCIe 5.0, NVMe M.2 2280, certificación 80 PLUS.

## Brand Commitments

- Nombre: **Sky Import**. Vinculado a importación aérea y a la frontera.
- Idioma público por defecto: español; portugués de Brasil como segundo idioma completo.
- Tono: técnico, directo, sin épica gamer. Se explica el porqué, no se grita la oferta.
- Debe sentirse tecnológica, confiable, moderna y especializada. **No** una tienda gamer
  genérica saturada de RGB.
- Restricciones visuales fijadas por el titular (vinculantes): base grafito / negro
  carbón / tonos metálicos; texto en blanco cálido o gris muy claro; azul cielo eléctrico
  o cian controlado como acento; tipografía técnica; composición editorial y ligeramente
  asimétrica.

## Evidence on Hand

- **Existe**: el número de WhatsApp comercial, las categorías, las especificaciones
  públicas de los modelos comerciales incluidos (verificadas contra la ficha del
  fabricante antes de escribirlas).
- **No existe y no debe inventarse**: dirección física, RUC, años de trayectoria,
  cantidad de clientes, distribución oficial, acuerdos con fabricantes, garantías
  respaldadas por terceros, reseñas de compradores, stock verificado, métricas de venta.
- **Precios, disponibilidad y condiciones comerciales**: son datos de configuración del
  proyecto, no información oficial del fabricante, y la interfaz lo dice.
- **Imágenes**: hay fotografías de producto con procedencia registrada en
  `public/products/SOURCES.md`, además de ilustraciones y escenas 3D propias.
  Registrar la procedencia no equivale a una certificación de derechos de uso.

## Product Principles

1. **La ficha antes que la promesa.** Si un dato decide la compra (socket, vataje,
   milímetros), va arriba y en tabla, no escondido en un párrafo.
2. **Compatibilidad declarada, no sugerida.** Toda advertencia explica el problema en
   lenguaje llano y admite que es una comprobación fundamental, no exhaustiva.
3. **La frontera es el contexto, no un detalle.** Idioma y moneda del visitante son
   funcionalidad de primera clase, no un selector escondido en el pie.
4. **Ningún dato visible sin lógica que lo sostenga.** Los estados (agotado, últimas
   unidades, oferta) se derivan de los datos; no se declaran a mano.
5. **La confirmación comercial es explícita.** Los importes derivados son referenciales;
   abrir WhatsApp o guardar un pedido no acredita pago ni una venta confirmada.

## Accessibility & Inclusion

- Navegación completa por teclado con foco visible en todo control.
- `prefers-reduced-motion` apaga de verdad cada pieza de movimiento, no la acorta.
- Cuerpo de texto ~16 px en móvil; objetivos táctiles ≥ 44 × 44 px.
- Cambios importantes del carrito anunciados por región `aria-live`.
- El cursor propio nunca puede dejar al visitante sin puntero.

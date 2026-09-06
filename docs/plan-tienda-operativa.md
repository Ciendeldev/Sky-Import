# Plan — Sky Import operativa

Estado del trabajo. Se marca sobre la marcha; sobrevive a un reinicio de sesión.

## Decisiones tomadas

- **Backend:** Supabase (`bhlkdinovdhtwxkkujic`). Postgres + Auth + RLS.
- **USD sigue siendo la fuente de verdad** de todo precio. Gs. y R$ se derivan
  de la tasa de `settings.fx`, editable desde el panel.
- **Variantes:** ejes abiertos por producto (`attributes` jsonb). En componentes
  de PC una variante es capacidad, velocidad, formato o color — no «talla».
- **El panel vive fuera de `[locale]`**, en `/admin`: no es bilingüe, no carga
  la intro ni el motor 3D, y no se indexa.
- **La contraseña del admin no está en el repositorio.** Vive hasheada en
  Supabase Auth.
- **WhatsApp de producción:** +595 994 222 542.
- **Fotografía real** en las 37 piezas; el dibujo vectorial queda como respaldo
  de cualquier pieza que no tenga foto.
- **Zonas de entrega por ciudad**, no por región: la tienda es de Ciudad del
  Este, no del Área Metropolitana de Asunción.

## Fases

- [x] **0 · Entorno.** Node 24.19.0 + npm 11.17.0 + gh 2.98.0 instalados
      (no había Node en la máquina). Higiene git, `.gitattributes`, `.nvmrc`,
      `.env.example`, `.mcp.json`. ESLint dejó de recorrer `.worktrees/`.
- [x] **1 · Mensajes de WhatsApp.** Los dos formatos exactos, con pruebas.
- [x] **2 · Esquema de la base.** Migraciones aplicadas en Supabase: esquema,
      RLS + funciones (`validate_coupon`, `place_order`) y datos base.
- [x] **3 · Sesión de administrador.** Login por usuario, guard de rutas,
      cierre de sesión. Cuenta «Cielo» creada y verificada.
- [x] **4 · Catálogo dinámico.** 37 productos cargados en Supabase.
- [x] **5 · Panel.** Productos, variantes, stock con alertas, tasa de cambio,
      cupones, pedidos.
- [x] **6 · Ficha de producto.** «Comprar por WhatsApp» como acción principal,
      barra fija en teléfono, selector de variantes.
- [x] **7 · Checkout.** Datos de entrega, ciudad, cupón y cierre por WhatsApp.
- [x] **8 · Producción.** Sin avisos de demostración; la tienda se indexa y el
      panel no.
- [x] **9 · Fotografía real.** 37 imágenes con procedencia documentada en
      `public/products/SOURCES.md`.
- [x] **10 · Armado 3D.** Escena WebGL del gabinete, plan de montaje y prueba
      de encendido con diagnóstico. Carga diferida y espera a que la intro
      termine.
- [x] **11 · Documentación SRS.** `docs/srs/SRS-Sky-Import.docx` según la
      plantilla de la cátedra, con diagrama de bloques y de flujo.

## Pendiente del usuario

- Ejecutar `supabase/migrations/20260831000400_ciudades.sql` en el SQL Editor
  para reemplazar «Gran Asunción / Interior» por las 21 ciudades.
- Completar en el SRS el nombre del estudiante y del docente.
- Consultar con el docente la desviación del lenguaje: la cátedra autoriza
  Java, C++, PHP o Python; el sistema está en TypeScript. El resto de las
  restricciones se cumplen.

## Ideas que quedaron fuera, por si se retoman

- Subir fotos desde el panel a Supabase Storage (hoy solo URL en variantes).
- Pantalla para editar zonas de envío sin tocar SQL.
- Datos estructurados JSON-LD de producto, ahora que la tienda se indexa.

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
  Supabase Auth. `.env.example` documenta qué variable hace falta.
- **WhatsApp de producción:** +595 994 222 542.
- **El enlace del mensaje** es la URL real de la ficha, no el marcador
  `concepto.de` del texto original.

## Fases

- [x] **0 · Entorno.** Node 24.19.0 + npm 11.17.0 + gh 2.98.0 instalados
      (no había Node en la máquina). Higiene git, `.gitattributes`, `.nvmrc`,
      `.env.example`, `.mcp.json` de Supabase. ESLint dejó de recorrer
      `.worktrees/`.
- [x] **1 · Mensajes de WhatsApp.** `src/lib/whatsapp.ts` con los dos formatos
      exactos y sus pruebas.
- [x] **2 · Esquema de la base.** Tres migraciones en `supabase/migrations/`:
      esquema, RLS + funciones (`validate_coupon`, `place_order`), datos base.
- [x] **3 · Sesión de administrador.** Login por usuario (no correo), guard de
      rutas, cierre de sesión.
- [x] **4 · Catálogo dinámico.** Los productos se leen de Supabase; el catálogo
      estático queda como respaldo mientras no haya claves.
- [x] **5 · Panel.** Productos, variantes, stock con alertas, tasa de cambio,
      cupones, pedidos.
- [x] **6 · Ficha de producto.** «Comprar por WhatsApp» como acción principal,
      barra fija en teléfono, selector de variantes que cambia foto, SKU y stock.
- [x] **7 · Checkout.** Formulario de datos y entrega, zona con costo, cupón,
      cierre por WhatsApp. Sin métodos de pago.
- [x] **8 · Producción.** Quitar todo aviso de demostración y la revelación del
      checkout simulado.
- [x] **9 · Verificación.** typecheck ✓ · lint ✓ · 66 unitarias ✓ · build ✓ ·
      69 end-to-end ✓ · axe 10/10 rutas sin infracciones WCAG 2.1 AA ✓.
      Publicación en GitHub: en curso.

## Pendiente del usuario

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` del panel de
  Supabase → van a `.env.local` y a las variables de entorno de Vercel.
- Confirmar el destino en GitHub: hoy el remoto es `Bryan-dev074/Sky-Import`.

## Publicación

`origin` apunta a `Ciendeldev/Sky-Import`; el remoto anterior quedó guardado
como `origin-anterior`. Los tres commits están hechos y el árbol limpio: falta
solo autenticar GitHub en esta máquina y empujar.

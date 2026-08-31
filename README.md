# Sky Import

Tienda de componentes para PC de Ciudad del Este, Paraguay. Catálogo tipado,
configurador de compatibilidad, carrito persistente y **cierre de venta por
WhatsApp**, en **español y portugués** y con precios en **dólares, guaraníes y
reales**. Con panel de administración sobre Supabase.

> **Cómo se cierra una venta.** No hay pasarela de pago ni selector de métodos.
> El checkout reúne los datos de entrega y arma un mensaje de WhatsApp con el
> pedido completo: piezas, códigos, cantidades, cupón, envío y total en
> guaraníes. El pedido queda registrado en la base **antes** de abrir la
> conversación, con estado «Iniciado por WhatsApp», para que el seguimiento
> comercial no dependa de que el cliente llegue a escribir.

---

## Vista previa

| | |
|---|---|
| **Entrada** | La cortina se desarma en lamas verticales que se retiran en secuencia |
| **Fondo vivo** | Retícula de vías que se abomba al acercarse el puntero, con onda de energía |
| **Inicio** | Hilos de ruido reactivos, titular por palabras, índice en celdas que responden por proximidad |
| **Ensamblaje** | Una placa de video construida en código con three.js que se arma al hacer scroll |
| **Catálogo** | 37 piezas con dibujo propio, búsqueda sin tildes, filtros en la URL |
| **Ficha** | «Comprar por WhatsApp» como acción principal, barra fija en teléfono y selector de variantes que cambia foto, SKU y stock |
| **Arma tu PC** | Tablero que compara zócalo, generación DDR, vataje y milímetros |
| **Checkout** | Una pantalla: datos, zona de entrega, cupón y el mensaje armado |
| **Panel** | Inventario, variantes, alertas de stock, tasa de cambio, cupones y pedidos |

**El idioma cambia sin recargar.** Español y portugués conviven en el paquete del
cliente: pulsar `PT` retraduce la tienda en el sitio, corrige la URL y deja el
scroll, el carrito y el armado donde estaban.

---

## Tecnologías

| Herramienta | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org) (App Router) | 16.2.12 | Marco, generación estática de las dos versiones de idioma |
| [React](https://react.dev) | 19.2.8 | Interfaz |
| [TypeScript](https://www.typescriptlang.org) | 5.9.3 | Modo estricto, con `noUncheckedIndexedAccess` |
| [Tailwind CSS](https://tailwindcss.com) | 4.3.3 | Sistema de estilos con los tokens en `@theme` |
| [Zustand](https://zustand.docs.pmnd.rs) | 5.0.14 | Carrito y armado, persistidos en `localStorage` |
| [three.js](https://threejs.org) | 0.185.1 | La pieza de ensamblaje y el fondo de haces, cargados dinámicamente |
| [ogl](https://github.com/oframe/ogl) | 1.0.11 | El fondo de hilos del primer viewport |
| [Vitest](https://vitest.dev) | 4.1.10 | Pruebas unitarias |
| [Playwright](https://playwright.dev) | 1.62.1 | Pruebas end-to-end |
| [axe-core](https://github.com/dequelabs/axe-core) | 4.x | Auditoría de accesibilidad |
| [sharp](https://sharp.pixelplumbing.com) | 0.35 | Generación de la imagen social |
| [Supabase](https://supabase.com) | JS 2.112 | Postgres, autenticación del panel y seguridad a nivel de fila |

El catálogo tipado del proyecto sigue siendo la semilla y el respaldo: **si no
hay claves de Supabase configuradas, la tienda funciona igual** con los datos
estáticos y vende por WhatsApp. Lo que deja de haber es panel.

---

## Requisitos

- Node.js **20.9 o superior** (probado en 24.17).
- npm 10 o superior. El proyecto usa **npm** de forma consistente; hay
  `package-lock.json` en el repositorio.

---

## Instalación local

```bash
npm install
```

```bash
npm run dev
```

La aplicación queda en `http://localhost:3000` y redirige a `/es` o `/pt` según
el idioma del navegador. **Sin configurar nada más ya funciona**: sirve el
catálogo estático y vende por WhatsApp.

---

## Puesta en marcha del panel

El panel de administración vive en `/admin` y necesita Supabase.

### 1 · Las claves

Copiá `.env.example` como `.env.local` y completá las dos claves del panel de
Supabase (**Project Settings → API**):

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pública por diseño; lo que protege los datos
  son las políticas RLS, no el secreto de esta clave.
- `SUPABASE_SERVICE_ROLE_KEY` — la «secret key». **Salta todas las políticas.**
  Solo servidor, y **solo hace falta para crear la cuenta de administración**:
  todo lo demás pasa por RLS con la sesión del operador. Una vez creada la
  cuenta, se puede quitar del despliegue.

### 2 · El esquema

En el panel de Supabase, **SQL Editor**, ejecutá en orden los tres archivos de
`supabase/migrations/`:

1. `20260831000100_esquema_inicial.sql` — tablas y tipos
2. `20260831000200_rls.sql` — políticas y las funciones `validate_coupon` y
   `place_order`
3. `20260831000300_datos_base.sql` — tasa de cambio, zonas de envío y categorías

Los tres son idempotentes: correrlos dos veces no rompe ni duplica nada.

### 3 · La cuenta de administración

Agregá `ADMIN_PASSWORD` a `.env.local` con la contraseña que quieras, y corré:

```bash
npm run admin:crear
```

Después **borrá `ADMIN_PASSWORD` de `.env.local`**. La contraseña queda hasheada
en Supabase Auth; no se guarda en el repositorio ni en ningún archivo del
proyecto.

### 4 · El catálogo

Entrá en `/admin` y pulsá **Importar el catálogo del proyecto**. Vuelca las 37
piezas con su ficha técnica y sus datos de compatibilidad. A partir de ahí el
catálogo se edita desde el panel.

**Si todavía no tenés cuenta de administración**, hay un camino que no necesita
ninguna credencial:

```bash
node scripts/generar-seed.mjs
```

Genera `supabase/seed-catalogo.sql` desde el mismo catálogo tipado que usa el
panel, y se pega en el SQL Editor. Es idempotente y **no toca las unidades en
stock**: esas las lleva el operador y no las pisa un archivo.

---

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run e2e` | Pruebas end-to-end (Playwright) |
| `npm run a11y` | Auditoría de accesibilidad con axe (WCAG 2.1 AA) |
| `npm run e2e:install` | Descarga el navegador que usa Playwright |
| `npm run assets` | Regenera `public/og.png` |
| `npm run size` | Comprueba el presupuesto de bundle |
| `npm run admin:crear` | Crea o restablece la cuenta del panel |
| `npm run hooks` | Instala los ganchos de git (lefthook) |
| `npm run verify` | lint + tipos + unitarias + build, en ese orden |

### Pruebas

```bash
npm test
```

```bash
npm run e2e:install && npm run e2e
```

Las pruebas end-to-end levantan solas la compilación de producción en el puerto
3100. Cubren el recorrido completo de compra hasta el mensaje de WhatsApp —con
su contenido verificado línea por línea—, el guard del panel, la intro, el
cursor, el movimiento reducido, el teclado, el cambio de moneda e idioma, el
configurador y los estados vacíos.

Las plantillas de los dos mensajes de WhatsApp tienen además su propia batería
de pruebas unitarias en `tests/unit/whatsapp.test.ts`: es el único cierre de
venta de la tienda, así que su formato está fijado carácter a carácter.

`npm run a11y` pasa **axe** sobre diez rutas en los dos idiomas y falla si
aparece cualquier infracción de WCAG 2.1 AA.

---

## Estructura

```
src/
  app/
    [locale]/            layout raíz + páginas (la ruta lleva el idioma)
      page.tsx           inicio
      catalogo/          catálogo con filtros
      producto/[slug]/   ficha con variantes y compra por WhatsApp
      armar/             configurador
      carrito/           carrito a pantalla completa
      checkout/          datos, entrega, cupón y cierre por WhatsApp
      guias/[slug]/      sección editorial
    admin/               SEGUNDO layout raíz — el panel, sin idioma ni 3D
      acceso/            pantalla de acceso
      (panel)/           rutas protegidas por el guard de sesión
        page.tsx         tablero con alertas de stock
        productos/       inventario, ficha y variantes
        pedidos/         historial y seguimiento comercial
        cupones/         alta y control de canjes
        precios/         tasa de cambio y umbrales
    global-not-found.tsx 404 de la casa
    globals.css          el sistema visual completo
    robots.ts · sitemap.ts
  components/
    background/          campo de vías, hilos y haces (los tres diferidos)
    brand/ chrome/ intro/ cursor/ motif/
    catalog/ product/ builder/ cart/ checkout/ home/
    motion/              primitivas: entrada, imán, vitrina, celdas, canto energizado
    render/              el dibujo propio de cada pieza + los degradados compartidos
    three/               la pieza de ensamblaje
    ui/ views/           las vistas de cada página
  config/site.ts         contacto, tipo de cambio y umbrales comerciales
  content/guides.ts      la sección editorial
  lib/
    catalog/             tipos, productos, categorías y estados derivados
    i18n/                idiomas y diccionario
    supabase/            clientes de navegador y servidor + tipos del esquema
    admin/               sesión, consultas y acciones del panel
    motion.ts            el bucle de animación compartido y sus ganchos
    whatsapp.ts          las DOS plantillas de mensaje, con su formato exacto
    variants.ts          ejes, selección y precio efectivo de las variantes
    checkout.ts          zonas de envío, cupones y registro del pedido
    cart.ts build.ts compat.ts money.ts search.ts prefs.ts ui.ts
  proxy.ts               resuelve el idioma de quien entra sin prefijo
supabase/
  migrations/            esquema, políticas RLS y datos de arranque
tests/
  unit/                  carrito, moneda, compatibilidad, búsqueda, WhatsApp
  e2e/                   recorrido de compra, guard del panel y experiencia
scripts/
  build-assets.mjs       genera la imagen social
  shots.mjs              capturas de verificación en los cinco tamaños
```

---

## Cómo editar el contenido

> **Con el panel en marcha, esto se hace desde `/admin`** y no tocando archivos:
> productos, variantes, stock, tasa de cambio, cupones y pedidos. Lo que sigue
> describe la **fuente estática**, que sigue siendo la semilla del catálogo y el
> respaldo mientras no haya Supabase configurado.
>
> Dos cosas se editan siempre en el código, a propósito: la **ficha técnica**
> (`specs`) y los **datos de compatibilidad** (`compat`). Son estructuras
> tipadas que alimentan el configurador, y un formulario de texto libre las
> rompería sin que nadie se entere hasta que un cliente arme una máquina
> imposible.

### Productos

Todo el catálogo vive en [`src/lib/catalog/products.ts`](src/lib/catalog/products.ts).
Cada pieza declara nombre, marca, modelo, código de referencia, precio en USD,
unidades, descripción en los dos idiomas, ficha técnica y un objeto `compat` que
es lo que consume el configurador.

Tres reglas que conviene no romper:

1. **`units` es la única fuente de la disponibilidad.** No existe un campo
   «agotado»: `0` unidades da agotado, `≤ 3` da «últimas unidades». Cambiá el
   umbral en `RULES.lowStockAt`.
2. **La oferta se deriva de `listPriceUsd`.** Si es mayor que `priceUsd`, la
   interfaz calcula y muestra el porcentaje. Si no existe, no hay oferta.
3. **`compat` cambia el comportamiento del configurador.** Un milímetro o un
   vatio distinto ahí cambia las advertencias; no hay una segunda copia del dato.
4. **`render.variant` cambia el dibujo.** No es un matiz: elige entre diseños
   distintos dentro de la familia (tres carcasas de placa de video, tres frentes
   de gabinete, disipador de una torre o de dos). `render.seed` desplaza los
   detalles menores de forma determinista.

Para agregar una pieza basta con añadir un objeto al array: el catálogo, los
filtros, el buscador, el configurador, el sitemap y las rutas estáticas se
actualizan solos.

### Precios y tipo de cambio

Con Supabase conectado, en **`/admin/precios`**. Sin él, en
[`src/config/site.ts`](src/config/site.ts):

```ts
export const FX = {
  PYG: 7400,   // guaraníes por dólar
  BRL: 5.4,    // reales por dólar
  reference: '2026-07',
}
```

El **dólar es la fuente de verdad** de todo precio. Guaraní y real se derivan con
esa tasa fija y se redondean «de vitrina» (al millar en guaraníes, al décimo en
reales). La interfaz los rotula siempre como **referenciales** y nunca afirma que
sean una cotización en vivo. Cambiar estos dos números actualiza toda la tienda
**y los mensajes de WhatsApp**, que van siempre en guaraníes.

### WhatsApp

En el mismo archivo:

```ts
export const CONTACT = {
  whatsapp: '595994222542',        // formato internacional, sin signos
  whatsappDisplay: '+595 994 222 542',
}
```

Si `whatsapp` queda como cadena vacía, **la interfaz oculta por completo todo
CTA de WhatsApp** en lugar de publicar un enlace roto. No hace falta tocar
ningún componente.

Los **dos formatos de mensaje** viven en
[`src/lib/whatsapp.ts`](src/lib/whatsapp.ts) y solo ahí:

- `productMessage` — compra directa desde la ficha, saltándose el carrito.
- `orderMessage` — pedido completo desde el checkout, con datos de entrega.

Las líneas que no aplican **no se imprimen**: sin cupón no hay línea de cupón,
sin notas no hay línea de notas. Un campo con un guion es peor que ningún campo,
porque obliga al vendedor a interpretarlo.

### Zonas de envío y cupones

Las zonas se editan en la tabla `shipping_zones` y los cupones en
**`/admin/cupones`**. Los cupones **no se leen nunca desde el navegador**: se
validan con una función de la base que devuelve el descuento ya calculado, así
que nadie puede enumerar los códigos vigentes mirando el código fuente.

### Textos de la interfaz

En [`src/lib/i18n/dictionary.ts`](src/lib/i18n/dictionary.ts). El español es la
fuente y el portugués está tipado como `Record<DictKey, string>`: si falta una
clave en portugués, **falla la comprobación de tipos**. Ningún texto puede quedar
en un solo idioma sin que se note.

---

## Desplegar en Vercel

1. En el panel de Vercel, **Add New → Project → Import Git Repository** y elegí
   este repositorio.
2. Vercel detecta Next.js solo. No hace falta cambiar el comando de compilación
   (`next build`), el directorio de salida ni el gestor de paquetes.
3. **Cargá las variables de entorno** en *Settings → Environment Variables*. Son
   las de [`.env.example`](.env.example):

   | Variable | Alcance |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Todos los entornos |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Todos los entornos |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Opcional y solo servidor.** Nunca con prefijo `NEXT_PUBLIC_` |
   | `ADMIN_USERNAME` · `ADMIN_EMAIL` | Todos los entornos |

   `ADMIN_PASSWORD` **no va a Vercel**: solo se usa una vez, en local, para
   crear la cuenta.
4. Desplegá.

Si más adelante se le pone un dominio propio, conviene actualizar `SITE.origin`
en `src/config/site.ts` para que las URLs absolutas de la metadata, el sitemap y
el enlace que viaja en los mensajes de WhatsApp apunten al dominio real.

### Sobre la indexación

La tienda **se indexa**. Lo único cerrado a los buscadores es el panel:
`robots.txt` lo excluye y `next.config.ts` le pone `X-Robots-Tag: noindex,
nofollow, noarchive` junto con `Cache-Control: no-store`. Dos capas, porque un
`robots.txt` es una petición y no una garantía.

El carrito y el checkout también quedan fuera del índice: no aportan nada en un
buscador.

---

## Documentación del proyecto

- [`PRODUCT.md`](PRODUCT.md) — verdad de producto: quién compra, en qué contexto,
  qué no se puede inventar.
- [`DESIGN.md`](DESIGN.md) — el sistema visual, con el rol y la prohibición de
  cada token.
- [`CLAUDE.md`](CLAUDE.md) — reglas duras del repositorio, para cualquiera que
  trabaje acá con un agente de código.
- [`LIBRERIAS.md`](LIBRERIAS.md) — qué librerías se adoptaron, cuáles se
  descartaron y por qué. **Se consulta antes de escribir cualquier componente.**
- [`docs/adr/`](docs/adr/) — registro de decisiones estructurales: Supabase como
  backend, WhatsApp como único cierre, variantes con ejes abiertos.
- [`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md) — qué se evaluó,
  qué se instaló, qué se descartó y por qué.
- [`CREDITS.md`](CREDITS.md) — licencias y recursos de terceros.

---

## Licencias y recursos de terceros

**El material de interfaz es autoral**: la pieza 3D es geometría generada en
código, el motivo de las pistas de circuito se genera a partir de una semilla, y
los renders vectoriales de componentes son SVG dibujados a mano —siguen siendo
el respaldo de cualquier pieza que no tenga fotografía—.

**Las fotografías de producto NO son autorales.** Son imágenes de prensa de los
fabricantes, recortadas sobre fondo transparente. La procedencia de cada una de
las 37 está en [`public/products/SOURCES.md`](public/products/SOURCES.md), con la
página oficial y el archivo original; varias llevan además el SHA-256 del
archivo de origen.

> **Esto hay que revisarlo antes de facturar con el sitio.** Las imágenes de
> prensa de un fabricante suelen permitirse para vender ese mismo producto, pero
> **cada marca tiene sus condiciones** y algunas de las fuentes del listado no
> son el fabricante sino una tienda o un fotógrafo. Dos del listado están bajo
> licencia libre (Wikimedia, CC0) y no tienen problema. Es un riesgo bajo y
> habitual en el comercio de componentes, pero es un riesgo real y conviene que
> lo conozcas en vez de descubrirlo por una carta.

Las tipografías (Archivo y Azeret Mono) son de licencia SIL Open Font License 1.1
y se sirven desde el propio dominio a través de `next/font`. El detalle completo
está en [`CREDITS.md`](CREDITS.md).

# LIBRERÍAS — catálogo del proyecto

> Consultar **antes** de escribir cualquier componente de interfaz, animación o
> efecto visual. La regla completa está en `CLAUDE.md`.
> Última revisión: 2026-09-06

## Contexto de este proyecto

- **Framework:** Next.js 16.3.4 (App Router, React 19.2.8)
- **Estilos:** Tailwind CSS 4.3.3 con los tokens en `@theme` (`src/app/globals.css`)
- **Base de componentes:** ninguna. Todo el sistema visual es propio y está
  documentado en `DESIGN.md`.
- **Motor de animación ADOPTADO:** **ninguno de terceros.** El proyecto tiene su
  propio motor en `src/lib/motion.ts` — un solo `requestAnimationFrame` con
  lista de suscriptores. ← **SOLO UNO**
- **Motor 3D:** three.js 0.185.1 (pieza de ensamblaje) y ogl 1.0.11 (fondo de
  hilos). Los dos cargados dinámicamente.
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Presupuesto de bundle:** 650 kB gzip, medidos sobre **todos** los chunks de
  cliente (`size-limit`). Hoy el proyecto pesa **621 kB**.

  > **Qué mide y qué no.** Es la suma de todo el JavaScript de cliente del
  > sitio, no lo que descarga una visita. Los dos bultos grandes —three.js y
  > ogl— se importan dinámicamente y **no entran en la primera carga**: three.js
  > solo baja cuando la sección de ensamblaje se acerca, y ogl solo en el primer
  > viewport de la portada.
  >
  > El presupuesto está calibrado sobre la medición actual con un margen del
  > 8 %. Sirve para **detectar regresiones**, que es para lo que sirve un
  > presupuesto: si una dependencia nueva lo rompe, hay que justificarla acá
  > antes de subir el techo.
- **Producto comercial:** **sí.** Determina qué licencias son válidas.

---

## ADOPTADAS

### img2threejs — reconstrucción de RTX 5090
- **Adoptada el:** 2026-09-07 por pedido explícito del cliente, reemplazando el descarte anterior.
- **Repositorio:** https://github.com/img2threejs/img2threejs · commit 6e60b5e22419464b4853e01ddb6c0e6f6659a733.
- **Licencia:** Apache-2.0, admite uso comercial.
- **Uso:** herramienta local de especificación, inventario y revisión; patrones de geometría y jerarquía para una RTX 5090 Founders Edition procedural. No es una dependencia npm ni una malla descargada.
- **Compatibilidad:** TypeScript y Three.js existente, integrado en efecto React 19. Sin segundo motor; scroll y giro usan onFrame.
- **Peso:** cero dependencias nuevas. Instancias para aletas y microcomponentes, carga diferida, presupuesto comprobado con size-limit.
- **Accesibilidad:** alternativa estática del mismo modelo con movimiento reducido o sin WebGL; selección mediante controles HTML con foco y etiquetas bilingües.
- **Decisión:** fábrica específica y datos separados; no incorporar el runtime genérico completo al navegador. Las partes internas no documentadas se declaran ilustrativas.


### three.js
- **Qué aporta:** el armado de la PC pieza por pieza en «Arma tu PC», con su
  prueba de encendido, y el fondo de haces. Geometría generada en código, sin
  modelos ni texturas importadas.
- **Recuperada en la portada el 2026-09-07 por pedido del cliente.** Despiece
  reversible de GPU con scroll nativo y panel sticky. Se reutiliza three.js
  (MIT, compatible con React 19 porque se monta en un efecto), sin dependencia
  ni motor nuevo: todas las actualizaciones usan `onFrame` de `motion.ts`.
  Carga diferida; foto real de respaldo y sin WebGL con movimiento reducido.
  Escena decorativa, sin controles de foco. GSAP y Motion siguen descartados:
  duplicarían el motor y aumentarían el bundle sin resolver una carencia actual.
  Se verifica el peso con `npm run size`.
- **Instalada como:** `npm install three @types/three`
- **Versión:** 0.185.1 · **Licencia:** MIT
- **Se usa en:** `src/components/three/GpuAssembly.tsx`,
  `src/components/background/Beams.tsx`
- **Adoptada el:** 2026-07 — **Motivo:** es el único camino para una pieza 3D
  animable por partes sin cargar un binario. Se importa dinámicamente y libera
  el contexto WebGL al salir de pantalla.

### ogl
- **Qué aporta:** el fondo de hilos reactivos del primer viewport.
- **Versión:** 1.0.11 · **Licencia:** MIT
- **Se usa en:** `src/components/background/Threads.tsx`
- **Adoptada el:** 2026-07 — **Motivo:** pesa una fracción de three.js para un
  efecto que solo necesita un shader a pantalla completa. Convive con three.js
  porque atienden momentos distintos y ninguno de los dos está siempre montado.

### Zustand
- **Qué aporta:** carrito y armado, persistidos en `localStorage` con saneo al
  rehidratar.
- **Versión:** 5.0.14 · **Licencia:** MIT
- **Se usa en:** `src/lib/cart.ts`, `src/lib/build.ts`, `src/lib/ui.ts`

### @supabase/supabase-js + @supabase/ssr
- **Qué aporta:** catálogo, variantes, cupones, pedidos y sesión del panel.
- **Versión:** 2.112.4 / 0.12.5 · **Licencia:** MIT
- **Se usa en:** `src/lib/supabase/`, `src/lib/admin/`, `src/lib/checkout.ts`
- **Adoptada el:** 2026-08-31 — **Motivo:** el panel de administración necesita
  base de datos y autenticación. Supabase aporta Postgres con RLS, que permite
  que la seguridad viva en la base y no solo en el código de la aplicación.

---

## EVALUADAS Y DESCARTADAS

### GSAP
- **Descartada el:** 2026-07 (confirmado 2026-08-31)
- **Motivo:** **duplica el motor de animación.** El proyecto ya tiene el suyo en
  `src/lib/motion.ts`, con un solo bucle compartido para toda la tienda; meter
  GSAP significaría dos motores peleándose por `transform` en los mismos nodos,
  que es el punto de choque documentado. Y añade ~70 kB para efectos que el
  motor propio ya cubre.
- **Reconsiderar si:** aparece una necesidad de scroll-telling con secciones
  sincronizadas y `scrub`, donde ScrollTrigger no tiene rival. En ese caso se
  adopta GSAP **y se retira el motor propio**, no los dos a la vez.

### React Bits
- **Descartada el:** 2026-08-31
- **Motivo:** dos razones independientes, cada una suficiente. **Licencia MIT +
  Commons Clause**, y este es un producto comercial de cliente. Y **cada
  componente arrastra su propia dependencia** (`gsap`, `motion`, `three`,
  `matter-js`), que es exactamente cómo se acaba con dos motores de animación en
  el mismo bundle sin darse cuenta.
- **Reconsiderar si:** nunca, mientras el proyecto sea comercial y tenga su
  propio sistema visual documentado en `DESIGN.md`.

### Uiverse
- **Descartada el:** 2026-08-31 como fuente de código.
- **Motivo:** clases genéricas sin prefijo (`.button`, `.card`) que colisionan
  con las de la casa, cero tokens, y su export a React mete `styled-components`
  en un proyecto Tailwind.
- **Uso aceptado:** banco de trucos CSS. Se mira la técnica, se entiende y se
  reescribe con los tokens del proyecto.

### shadcn/ui
- **Descartada el:** 2026-08-31
- **Motivo:** el proyecto tiene un sistema visual propio, completo y documentado
  al detalle, con reglas explícitas sobre radios, sombras y acento. shadcn traería
  una segunda gramática de componentes y su propia escala de radios.
- **Reconsiderar si:** hiciera falta un componente con contrato ARIA complejo
  (combobox, menú anidado) donde escribirlo a mano sea peor que adoptar Radix
  para ESA pieza.

### Motion (ex framer-motion)
- **Descartada el:** 2026-08-31
- **Motivo:** mismo motivo que GSAP — segundo motor de animación.


---

## CANDIDATAS (no evaluadas aún)

### TanStack Table — <https://tanstack.com/table>
- **Podría servir para:** la lista de productos del panel, si crece más allá de
  unos cientos de filas y hacen falta orden, filtro y paginación de verdad.
- **Pendiente de verificar:** hoy la tabla es HTML plano y con 37 piezas sobra.
  No entra hasta que el tamaño lo justifique.

---

## CATÁLOGO DE REFERENCIA

| Librería | Categoría | Licencia | Compatible | Notas |
|---|---|---|---|---|
| three.js | 3D | MIT | ✅ | Adoptada. Importación dinámica obligatoria |
| ogl | 3D ligero | MIT | ✅ | Adoptada. Solo el fondo del primer viewport |
| Zustand | Estado | MIT | ✅ | Adoptada |
| Supabase JS | Backend | MIT | ✅ | Adoptada |
| shadcn/ui | Primitivas | MIT | ⚠️ | Solo si hace falta un contrato ARIA complejo |
| Radix / Ark | Headless | MIT | ⚠️ | Igual que arriba, pieza por pieza |
| React Bits | Decorativa | MIT + Commons Clause | ❌ | Licencia incompatible con producto comercial |
| Uiverse | Referencia | MIT (comunidad) | ⚠️ | **Solo referencia visual** |
| GSAP | Animación | Gratis | ❌ | Duplica el motor propio |
| Motion | Animación | MIT | ❌ | Duplica el motor propio |
| img2threejs | 3D (skill) | Apache-2.0 | Sí | Herramientas locales y patrones para RTX 5090 |
| TanStack Table | Datos | MIT | ⚠️ | Cuando el panel lo justifique |

Leyenda: ✅ verificada en este proyecto · ⚠️ con condiciones · ❌ incompatible

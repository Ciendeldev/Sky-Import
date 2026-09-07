# Créditos y avisos de terceros

## Material gráfico

**Todo el material gráfico de este proyecto es autoral.** No se reproduce
ninguna fotografía, logotipo, tipografía de marca ni recurso visual de terceros.

- **Renders de componentes** (`src/components/render/ComponentRender.tsx`) —
  SVG dibujados a mano para este proyecto. Placa de video, procesador, placa
  madre, memoria, SSD M.2 y SATA, fuente, disipador de aire, refrigeración
  líquida, gabinete, ventiladores y pasta térmica.
- **Pieza 3D** (`src/components/three/GpuAssembly.tsx`) — geometría generada en
  código con primitivas de three.js. Sin mallas importadas, sin texturas, sin
  archivos binarios.
- **Motivo de pistas de circuito** (`src/components/motif/Trace.tsx`) — generado
  a partir de una semilla con un generador determinista propio.
- **Marca gráfica y denominativa** (`src/components/brand/Wordmark.tsx`,
  `public/icon.svg`) — dibujadas para este proyecto.
- **Imagen social** (`public/og.png`) — generada por `scripts/build-assets.mjs`,
  con las letras del sello dibujadas como rectángulos para no depender de que el
  rasterizador tenga la tipografía instalada.

Los nombres de fabricantes y modelos que aparecen en el catálogo (NVIDIA, AMD,
Intel, ASUS, MSI, Gigabyte, ASRock, Corsair, G.Skill, Kingston, Samsung, Western
Digital, Crucial, Seasonic, Noctua, Thermalright, ARCTIC, Lian Li, NZXT, Cooler
Master, Thermal Grizzly) son **marcas de sus respectivos titulares** y se usan
únicamente para identificar el producto al que se refiere cada ficha. No se
reproduce ningún logotipo ni recurso gráfico de esas marcas, y este proyecto no
está afiliado a ninguna de ellas.

---

## Tipografías

| Familia | Autoría | Licencia |
|---|---|---|
| **Archivo** | Omnibus-Type | SIL Open Font License 1.1 |
| **Azeret Mono** | Displaay Type Foundry | SIL Open Font License 1.1 |

Ambas se obtienen a través de `next/font/google`, que las **descarga en tiempo de
compilación y las sirve desde el propio dominio**: no hay ninguna petición del
navegador a un tercero, ni en tiempo de ejecución ni de forma diferida. Se carga
únicamente el subconjunto `latin`, que cubre por completo el español y el
portugués.

La SIL OFL permite el uso, la modificación y la redistribución, incluida la
comercial, siempre que las tipografías no se vendan por sí solas y que los
archivos derivados no usen los nombres reservados. Este proyecto solo las
incrusta; no las modifica ni las redistribuye por separado.

---

## Dependencias

| Paquete | Licencia |
|---|---|
| next | MIT |
| react · react-dom | MIT |
| zustand | MIT |
| three | MIT |
| tailwindcss · @tailwindcss/postcss | MIT |
| typescript | Apache-2.0 |
| eslint · eslint-config-next | MIT |
| vitest | MIT |
| @playwright/test | Apache-2.0 |
| @axe-core/playwright · axe-core | MPL-2.0 |
| ogl | Unlicense |
| sharp | Apache-2.0 |

---

## React Bits — código adaptado

<https://reactbits.dev> · **MIT + Commons Clause**

A pedido expreso del titular del proyecto, cinco componentes de React Bits se
integraron **adaptados**, no copiados: en todos hubo que cambiar la paleta, la
geometría o la implementación para que encajaran con el sistema visual y con el
presupuesto de rendimiento de este proyecto.

| Componente | Archivo en este repositorio | Qué se cambió |
|---|---|---|
| `DotField` | `src/components/background/CircuitField.tsx` | Reescrito entero: canvas 2D, los puntos son pads de vía de una placa, agrupados en cuatro cubos de intensidad para pintar cada uno con una sola llamada. No es un fondo global: `FieldPatch` lo coloca en dos tramos concretos y lo desmonta al salir de pantalla. |
| `Threads` | `src/components/background/Threads.tsx` | Portado a TypeScript, paleta de la casa, menos líneas, resolución interna acotada, guardián de cuadros y liberación del contexto WebGL. |
| `Beams` | `src/components/background/Beams.tsx` | **Portado a three.js plano** (el original usa `@react-three/fiber` y `@react-three/drei`); ruido de UV con semilla en vez de `Math.random()`. |
| `BorderGlow` | `src/components/motion/EdgeGlow.tsx` y `.u-edge` en `globals.css` | Un solo color, radio de 3 px, sin degradado de malla multicolor. Envuelve la pieza `.u-cta` (`src/components/ui/Cta.tsx`), que es propia. |
| `MagicBento` | `src/components/motion/Cell.tsx` y `.u-cell` en `globals.css` | **Sin GSAP** (bucle de animación propio) y **sin partículas flotantes**. |

La Commons Clause permite usar los componentes dentro de una aplicación y
prohíbe venderlos, sublicenciarlos o redistribuirlos por separado. Este
repositorio contiene adaptaciones dentro de un producto, no una redistribución
de la colección, y ninguno de estos componentes se ofrece como producto.

---

## Otros recursos evaluados

El razonamiento completo está en
[`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md).

- **Impeccable** (<https://impeccable.style>) — usado como skill de criterio
  visual durante el diseño. No aporta código al producto final.
- **Emil Kowalski skills** (<https://emilkowal.ski/skill>) — no instalado.
- **Taste Skill** (<https://www.tasteskill.dev>) — no instalado.
- **Uiverse** (<https://uiverse.io>) — no utilizado. La consulta automatizada
  recibió `403` y no se pudo verificar de primera mano el estado de sus
  condiciones de uso, así que se descartó la fuente en lugar de asumir nada.
- **GSAP** (<https://gsap.com>) — v3.15.0, hoy gratuito para todo uso incluidos
  los plugins que antes eran de pago. Se instaló, se evaluó y se **desinstaló**:
  no había ninguna animación protagonista donde aportara una diferencia
  perceptible frente a CSS más un único bucle de `requestAnimationFrame`.
- **img2threejs** (<https://github.com/img2threejs/img2threejs>) — Apache-2.0.
  Adoptado el 2026-09-07 por pedido del cliente. Checkout local en commit
  6e60b5e22419464b4853e01ddb6c0e6f6659a733. Guías, herramientas de especificación,
  admisión de referencia y cobertura de partes utilizadas para la RTX 5090 FE.
  Fábrica propia con geometría procedural e inventario separado; sin añadir
  dependencias al navegador. Véase docs/adr/009-rtx5090-procedural.md.
- **NVIDIA RTX 5090 Founders Edition** — referencias visuales oficiales para
  la reconstrucción. Marcas pertenecientes a NVIDIA. La imagen de respaldo
  publicada es un render propio de la fábrica Three.js.

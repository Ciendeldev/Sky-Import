/**
 * ICONOS DEL PANEL
 *
 * Dibujados acá y no importados: cinco iconos de línea no justifican una
 * dependencia, y una librería de iconos traería su propia gramática de trazo
 * —grosores, terminaciones, redondeos— que pelearía con la del sello.
 *
 * Todos comparten la ley del sello de la casa: trazo de 1,5, terminación
 * cuadrada, rejilla de 16 y ni un relleno. Vistos juntos en la barra lateral
 * tienen que leerse como una familia, no como cinco dibujos sueltos.
 *
 * Son decoración: la etiqueta de texto va siempre al lado, así que llevan
 * `aria-hidden` y el lector de pantalla no los nombra dos veces.
 */

const COMUN = {
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
}

/** Tablero: cuatro campos, la vista de conjunto. */
function Tablero() {
  return (
    <svg {...COMUN}>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  )
}

/** Productos: una caja cerrada con su precinto. */
function Productos() {
  return (
    <svg {...COMUN}>
      <path d="M2 5.2 8 2.2l6 3v5.6l-6 3-6-3Z" />
      <path d="M2 5.2 8 8.2l6-3" />
      <path d="M8 8.2v5.6" />
    </svg>
  )
}

/** Pedidos: la boleta, con su borde dentado abajo. */
function Pedidos() {
  return (
    <svg {...COMUN}>
      <path d="M3.2 2h9.6v12l-1.6-1.1-1.6 1.1-1.6-1.1-1.6 1.1L4.8 14l-1.6 1.1Z" />
      <path d="M5.8 5.6h4.4M5.8 8.2h4.4" />
    </svg>
  )
}

/** Cupones: el troquel del ticket, con su perforación. */
function Cupones() {
  return (
    <svg {...COMUN}>
      <path d="M2 4.4h12v2.2a1.4 1.4 0 0 0 0 2.8v2.2H2V9.4a1.4 1.4 0 0 0 0-2.8Z" />
      <path d="M9.4 6v1M9.4 9v1" />
    </svg>
  )
}

/** Precios: los cursores de una mesa de mezclas. Se ajustan, no se escriben. */
function Precios() {
  return (
    <svg {...COMUN}>
      <path d="M3 2v5M3 10v4M8 2v2M8 7v7M13 2v8M13 13v1" />
      <path d="M1.6 8.5h2.8M6.6 5.5h2.8M11.6 11.5h2.8" />
    </svg>
  )
}

export const ICONOS = {
  tablero: Tablero,
  productos: Productos,
  pedidos: Pedidos,
  cupones: Cupones,
  precios: Precios,
} as const

export type IconoPanel = keyof typeof ICONOS

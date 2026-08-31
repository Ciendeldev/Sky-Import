/**
 * Configuración única de la casa.
 *
 * Todo lo que un operador tendría que cambiar vive acá y en ningún otro sitio:
 * contacto, tipo de cambio, umbrales comerciales. Nada de esto se repite en los
 * componentes.
 */

export const SITE = {
  name: 'Sky Import',
  /** Marca denominativa partida — se compone en el sello. */
  wordmark: ['SKY', 'IMPORT'] as const,
  city: 'Ciudad del Este',
  region: 'Alto Paraná',
  country: 'Paraguay',
  /** Sin dominio propio todavía; se usa para URLs absolutas de metadata. */
  origin: 'https://sky-import.vercel.app',
} as const

/**
 * Contacto comercial.
 *
 * `whatsapp` en formato internacional sin signos. Si se deja vacío, la interfaz
 * oculta por completo todo CTA de WhatsApp en lugar de publicar un enlace falso.
 */
export const CONTACT = {
  whatsapp: '595994222542',
  whatsappDisplay: '+595 994 222 542',
  email: '',
} as const

export const hasWhatsapp = CONTACT.whatsapp.length > 0

export function whatsappLink(message: string): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
}

/**
 * Tipo de cambio REFERENCIAL y fijo.
 *
 * El USD es la fuente de verdad de todo precio del catálogo; PYG y BRL se derivan.
 * No hay ninguna fuente en vivo detrás de estos números y la interfaz nunca afirma
 * que lo haya: en toda pantalla donde aparece una moneda derivada se muestra la
 * palabra «referencial».
 *
 * Para actualizarlos basta editar este objeto: no hay otra copia en el proyecto.
 */
export const FX = {
  /** Guaraníes por dólar. */
  PYG: 7400,
  /** Reales por dólar. */
  BRL: 5.4,
  /** Fecha de la referencia, en texto plano — nunca se calcula en render. */
  reference: '2026-07',
} as const

/** Umbrales comerciales de los que se derivan los estados visibles. */
export const RULES = {
  /** Al llegar o bajar de esta cantidad, la pieza muestra «últimas unidades». */
  lowStockAt: 3,
  /** Envío bonificado dentro del país a partir de este neto en USD. */
  freeShippingUsd: 400,
  /** Costo de envío nacional cuando no aplica la bonificación. */
  shippingUsd: 12,
} as const

/**
 * Configuración única de la casa.
 *
 * Todo lo que un operador tendría que cambiar vive acá y en ningún otro sitio:
 * contacto, tipo de cambio, umbrales comerciales. Nada de esto se repite en los
 * componentes.
 */

/**
 * Dominio público de la tienda.
 *
 * De acá salen la URL canónica, el sitemap, las etiquetas Open Graph y —lo que
 * más duele si se equivoca— el enlace a la ficha que viaja dentro de cada
 * mensaje de WhatsApp. Un origen mal escrito no rompe ninguna compilación:
 * simplemente manda a los clientes a otra parte.
 *
 * Estuvo apuntando a `sky-import.vercel.app`, que es de otra empresa. El
 * despliegue real es `sky-import-jet.vercel.app`. Para que no vuelva a pasar,
 * el día que haya dominio propio basta con definir `NEXT_PUBLIC_SITE_ORIGIN`
 * en Vercel: no hace falta tocar el código ni volver a acordarse de este
 * archivo.
 */
function resolveOrigin(): string {
  const declarado = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim()
  if (declarado) return declarado.replace(/\/+$/, '')
  return 'https://sky-import-jet.vercel.app'
}

export const SITE = {
  name: 'Sky Import',
  /** Marca denominativa partida — se compone en el sello. */
  wordmark: ['SKY', 'IMPORT'] as const,
  city: 'Ciudad del Este',
  region: 'Alto Paraná',
  country: 'Paraguay',
  /** Sin dominio propio todavía: el subdominio del despliegue. */
  origin: resolveOrigin(),
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

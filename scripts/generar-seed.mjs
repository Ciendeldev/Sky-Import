/**
 * Genera `supabase/seed-catalogo.sql` a partir del catálogo tipado del proyecto.
 *
 * Existe porque importar el catálogo desde el panel exige tener ya la cuenta de
 * administración, y crear esa cuenta exige la clave de servicio. Esto rompe el
 * círculo: produce un archivo SQL que se pega en el editor de Supabase sin
 * necesitar ninguna credencial.
 *
 * Lee la MISMA fuente que el panel (`src/lib/catalog/products.ts`), así que las
 * dos rutas no se pueden separar.
 *
 *   node scripts/generar-seed.mjs
 *
 * El archivo resultante es idempotente: `on conflict (slug) do update`. Correrlo
 * dos veces deja el mismo estado, y no pisa las unidades que el operador haya
 * cargado a mano salvo en el primer alta.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * El catálogo es TypeScript con alias de importación, así que no se puede
 * importar desde Node a secas. En vez de montar un compilador, se evalúa el
 * literal del array: el archivo es datos puros, sin lógica.
 */
function leerCatalogo() {
  const fuente = readFileSync(join(raiz, 'src/lib/catalog/products.ts'), 'utf8')

  const inicio = fuente.indexOf('export const PRODUCTS: Product[] = [')
  if (inicio < 0) throw new Error('No se encontró el array PRODUCTS.')

  // Del corchete de apertura al que lo cierra, contando anidamiento.
  // Se busca DESPUÉS del `=`: la anotación de tipo `Product[]` también lleva
  // corchetes, y sin esto se tomaría ese par como si fuera el array entero.
  const desde = fuente.indexOf('[', fuente.indexOf('=', inicio))
  let nivel = 0
  let hasta = -1
  for (let i = desde; i < fuente.length; i += 1) {
    const c = fuente[i]
    if (c === '[') nivel += 1
    else if (c === ']') {
      nivel -= 1
      if (nivel === 0) {
        hasta = i
        break
      }
    }
  }
  if (hasta < 0) throw new Error('El array PRODUCTS no cierra.')

  // `L(es, pt)` y las constantes de color se declaran arriba del array; se
  // reproducen acá para poder evaluar el literal tal cual está escrito.
  const preludio = `
    const L = (es, pt) => ({ es, pt })
    const STEEL = '#6E7A85', GRAPHITE = '#414D58', NICKEL = '#98A3AD',
          COPPER = '#B87A4E', SKY = '#55C8F5'
  `

  // El objeto `S` de etiquetas compartidas se toma literal del archivo.
  const sDesde = fuente.indexOf('const S = {')
  const sHasta = fuente.indexOf('\n}', sDesde) + 2
  const sBloque = fuente.slice(sDesde, sHasta)

  const cuerpo = fuente.slice(desde, hasta + 1)
  return new Function(`${preludio}\n${sBloque}\nreturn ${cuerpo}`)()
}

/** Escapa una cadena para un literal de Postgres. */
const q = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`
/** Serializa a jsonb, escapando las comillas simples del JSON. */
const j = (v) => `${q(JSON.stringify(v))}::jsonb`
const n = (v) => (v === undefined || v === null ? 'null' : Number(v))
const b = (v) => (v ? 'true' : 'false')

const productos = leerCatalogo()
if (!Array.isArray(productos) || productos.length === 0) {
  throw new Error('El catálogo salió vacío: revisá el parseo.')
}

const filas = productos.map((p) =>
  [
    q(p.slug),
    q(p.ref),
    q(p.name),
    q(p.brand ?? ''),
    q(p.model ?? ''),
    q(p.category),
    n(p.priceUsd),
    n(p.listPriceUsd),
    n(p.units),
    b(p.arrivedRecently),
    b(p.featured),
    q(p.blurb.es),
    q(p.blurb.pt),
    j(p.specs),
    j(p.compat),
    j(p.render),
  ].join(', '),
)

const sql = `-- ═══════════════════════════════════════════════════════════════════════════
-- CATÁLOGO INICIAL — ${productos.length} piezas
--
-- GENERADO por \`node scripts/generar-seed.mjs\` desde
-- \`src/lib/catalog/products.ts\`. No lo edites a mano: editá el catálogo y
-- volvé a generarlo, o cambiá los datos desde el panel.
--
-- Es idempotente. Al reejecutarlo actualiza nombre, precio y ficha, pero NO
-- toca las unidades en stock: esas las lleva el operador y no las pisa un
-- archivo.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.products (
  slug, ref, name, brand, model, category_slug,
  price_usd, list_price_usd, units,
  arrived_recently, featured,
  blurb_es, blurb_pt,
  specs, compat, render
) values
${filas.map((f) => `  (${f})`).join(',\n')}
on conflict (slug) do update set
  ref              = excluded.ref,
  name             = excluded.name,
  brand            = excluded.brand,
  model            = excluded.model,
  category_slug    = excluded.category_slug,
  price_usd        = excluded.price_usd,
  list_price_usd   = excluded.list_price_usd,
  arrived_recently = excluded.arrived_recently,
  featured         = excluded.featured,
  blurb_es         = excluded.blurb_es,
  blurb_pt         = excluded.blurb_pt,
  specs            = excluded.specs,
  compat           = excluded.compat,
  render           = excluded.render;
  -- \`units\` queda fuera a propósito: el stock lo manda el panel.

select count(*) as piezas_en_catalogo from public.products;
`

const destino = join(raiz, 'supabase/seed-catalogo.sql')
writeFileSync(destino, sql, 'utf8')

console.log(`\n  ✓ ${productos.length} productos escritos en supabase/seed-catalogo.sql`)
console.log('    Pegalo en el SQL Editor de Supabase y ejecutalo.\n')

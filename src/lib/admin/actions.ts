'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseServer, hasSupabase } from '@/lib/supabase/server'
import { emailForUsername, requireAdmin, requireModerator } from '@/lib/admin/auth'
import { PRODUCTS } from '@/lib/catalog/products'
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/catalog/categories'
import type { CouponKind, OrderStatus } from '@/lib/supabase/types'

/**
 * ACCIONES DEL PANEL
 *
 * Todas empiezan comprobando la sesión. Ninguna confía en que la pantalla que
 * la llamó ya lo hubiera hecho: una acción de servidor es una ruta pública con
 * otro nombre.
 *
 * Las que devuelven `{ error }` lo hacen para que el formulario pinte el motivo
 * sin perder lo que el operador había escrito.
 */

export interface ActionResult {
  ok: boolean
  error?: string
  message?: string
}

// ═══════════════════════════════════════════════════════════════════ acceso

export async function signIn(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!hasSupabase) {
    return { ok: false, error: 'La tienda todavía no tiene Supabase configurado.' }
  }

  const username = String(form.get('username') ?? '')
  const password = String(form.get('password') ?? '')

  if (!username || !password) {
    return { ok: false, error: 'Completá usuario y contraseña.' }
  }

  const email = emailForUsername(username)
  if (!email) {
    // Mismo mensaje que una contraseña incorrecta: no se le confirma a nadie
    // qué nombres de usuario existen.
    return { ok: false, error: 'Usuario o contraseña incorrectos.' }
  }

  const supabase = await supabaseServer()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' }
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id, revoked_at')
    .eq('user_id', data.user.id)
    .maybeSingle()

  // La revocación se comprueba ACÁ y no solo en el guard del panel. Si no,
  // la contraseña sigue siendo válida en Auth, el acceso «entra», queda una
  // cookie de sesión creada para una cuenta sin permisos y recién `/admin` la
  // rebota: la persona vuelve al formulario vacío sin saber por qué.
  //
  // Se le dice qué pasó en vez de dejarla creyendo que se equivocó de clave.
  // El mensaje solo aparece después de acertar la contraseña, así que no le
  // sirve a nadie para averiguar qué cuentas existen.
  if (!admin || admin.revoked_at) {
    await supabase.auth.signOut()
    return {
      ok: false,
      error: admin
        ? 'Tu acceso al panel fue retirado. Pedile al moderador que te lo devuelva.'
        : 'Esta cuenta no tiene permisos de administración.',
    }
  }

  redirect('/admin')
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/admin/acceso')
}

// ════════════════════════════════════════════════════════════════ productos

export async function saveProduct(form: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()

  const id = String(form.get('id') ?? '')
  const listPrice = Number(form.get('list_price_usd') ?? 0)
  const minStock = String(form.get('min_stock') ?? '')

  const payload = {
    slug: String(form.get('slug') ?? '').trim(),
    ref: String(form.get('ref') ?? '').trim(),
    name: String(form.get('name') ?? '').trim(),
    brand: String(form.get('brand') ?? '').trim(),
    model: String(form.get('model') ?? '').trim(),
    category_slug: String(form.get('category_slug') ?? ''),
    price_usd: Number(form.get('price_usd') ?? 0),
    // Un precio anterior que no supera al actual no es una oferta: es ruido.
    list_price_usd: listPrice > 0 ? listPrice : null,
    units: Math.max(0, Number(form.get('units') ?? 0)),
    min_stock: minStock === '' ? null : Math.max(0, Number(minStock)),
    blurb_es: String(form.get('blurb_es') ?? ''),
    blurb_pt: String(form.get('blurb_pt') ?? ''),
    featured: form.get('featured') === 'on',
    arrived_recently: form.get('arrived_recently') === 'on',
    active: form.get('active') !== null ? form.get('active') === 'on' : true,
  }

  if (!payload.slug || !payload.ref || !payload.name) {
    return { ok: false, error: 'Slug, código y nombre son obligatorios.' }
  }
  if (!Number.isFinite(payload.price_usd) || payload.price_usd < 0) {
    return { ok: false, error: 'El precio tiene que ser un número positivo.' }
  }

  const { error } = id
    ? await supabase.from('products').update(payload).eq('id', id)
    : await supabase.from('products').insert(payload)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath('/', 'layout')
  return { ok: true, message: id ? 'Producto actualizado.' : 'Producto creado.' }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/productos')
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Producto eliminado.' }
}

/** Ajuste rápido de stock desde la lista, sin abrir la ficha entera. */
export async function setStock(id: string, units: number): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('products')
    .update({ units: Math.max(0, Math.floor(units)) })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/productos')
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ════════════════════════════════════════════════════════════════ variantes

export async function saveVariant(form: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()

  const id = String(form.get('id') ?? '')
  const price = String(form.get('price_usd') ?? '')

  // Los ejes llegan como pares paralelos: attr_key[] y attr_value[].
  const keys = form.getAll('attr_key').map(String)
  const values = form.getAll('attr_value').map(String)
  const attributes: Record<string, string> = {}
  keys.forEach((key, i) => {
    const k = key.trim()
    const v = (values[i] ?? '').trim()
    if (k && v) attributes[k] = v
  })

  const payload = {
    product_id: String(form.get('product_id') ?? ''),
    sku: String(form.get('sku') ?? '').trim(),
    label_es: String(form.get('label_es') ?? '').trim(),
    label_pt: String(form.get('label_pt') ?? '').trim() || String(form.get('label_es') ?? '').trim(),
    attributes,
    // Sin precio propio, la variante hereda el del producto.
    price_usd: price === '' ? null : Number(price),
    units: Math.max(0, Number(form.get('units') ?? 0)),
    image_url: String(form.get('image_url') ?? '').trim() || null,
    sort_order: Number(form.get('sort_order') ?? 0),
    active: form.get('active') !== null ? form.get('active') === 'on' : true,
  }

  if (!payload.sku || !payload.label_es) {
    return { ok: false, error: 'La variante necesita SKU y nombre.' }
  }

  const { error } = id
    ? await supabase.from('product_variants').update(payload).eq('id', id)
    : await supabase.from('product_variants').insert(payload)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath('/', 'layout')
  return { ok: true, message: id ? 'Variante actualizada.' : 'Variante creada.' }
}

export async function deleteVariant(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('product_variants').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/productos')
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Variante eliminada.' }
}

// ═════════════════════════════════════════════════════ tasa de cambio y reglas

export async function saveFx(form: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()

  const pyg = Number(form.get('PYG') ?? 0)
  const brl = Number(form.get('BRL') ?? 0)

  // Rangos, no solo «mayor que cero». Acá el guaraní se escribe con punto de
  // millar —7.400—, y un `type="number"` se come ese punto: queda 7. Con la
  // comprobación vieja eso se guardaba tan campante y dividía por mil el precio
  // de TODA la tienda, que seguía vendiendo a esos importes. Ya pasó una vez.
  //
  // Los límites son de cordura, no de mercado: el guaraní lleva décadas en los
  // miles por dólar y el real en unidades. Cualquier valor fuera de esto es un
  // error de tipeo, no una devaluación.
  if (!Number.isFinite(pyg) || pyg < 1000 || pyg > 20000) {
    return {
      ok: false,
      error: 'El guaraní por dólar tiene que estar entre 1000 y 20000. Escribilo sin punto: 7400, no 7.400.',
    }
  }
  if (!Number.isFinite(brl) || brl < 1 || brl > 50) {
    return { ok: false, error: 'El real por dólar tiene que estar entre 1 y 50. Usá el punto como decimal: 5.39.' }
  }

  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'fx',
      value: {
        PYG: pyg,
        BRL: brl,
        reference: String(form.get('reference') ?? '').trim(),
        auto: form.get('auto') === 'on',
        updated_at: new Date().toISOString(),
      },
    })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Tasa de cambio actualizada en toda la tienda.' }
}

export async function saveRules(form: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()

  const { error } = await supabase.from('settings').upsert({
    key: 'rules',
    value: {
      lowStockAt: Math.max(0, Number(form.get('lowStockAt') ?? 3)),
    },
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Umbrales actualizados.' }
}

// ══════════════════════════════════════════════════════════════════ cupones

export async function saveCoupon(form: FormData): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()

  const id = String(form.get('id') ?? '')
  const kind = String(form.get('kind') ?? 'percent') as CouponKind
  const value = Number(form.get('value') ?? 0)
  const maxUses = String(form.get('max_uses') ?? '')
  const expires = String(form.get('expires_at') ?? '')
  const starts = String(form.get('starts_at') ?? '')

  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'El valor del cupón tiene que ser mayor que cero.' }
  }
  if (kind === 'percent' && value > 100) {
    return { ok: false, error: 'Un descuento por porcentaje no puede superar el 100 %.' }
  }

  const payload = {
    code: String(form.get('code') ?? '').trim().toUpperCase(),
    kind,
    value,
    min_purchase_usd: Math.max(0, Number(form.get('min_purchase_usd') ?? 0)),
    starts_at: starts ? new Date(starts).toISOString() : null,
    expires_at: expires ? new Date(expires).toISOString() : null,
    max_uses: maxUses === '' ? null : Math.max(1, Number(maxUses)),
    active: form.get('active') !== null ? form.get('active') === 'on' : true,
  }

  if (!payload.code) return { ok: false, error: 'El cupón necesita un código.' }

  const { error } = id
    ? await supabase.from('coupons').update(payload).eq('id', id)
    : await supabase.from('coupons').insert(payload)

  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'Ya existe un cupón con ese código.' : error.message,
    }
  }

  revalidatePath('/admin/cupones')
  return { ok: true, message: id ? 'Cupón actualizado.' : 'Cupón creado.' }
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/cupones')
  return { ok: true, message: 'Cupón eliminado.' }
}

// ══════════════════════════════════════════════════════════════════ pedidos

export async function setOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/pedidos')
  return { ok: true }
}

/**
 * BORRA UN PEDIDO Y DEVUELVE SUS UNIDADES AL STOCK
 *
 * Solo el moderador, y es irreversible: no hay papelera. Por eso la pantalla
 * pide confirmar escribiendo el número del pedido.
 *
 * El trabajo lo hace `delete_order` en la base, no acá. Devolver el stock y
 * borrar la fila tienen que ser una sola transacción: si se hiciera en dos
 * pasos desde el servidor y el segundo fallara, quedaría un pedido con las
 * unidades ya devueltas, y reintentarlo las devolvería por segunda vez.
 *
 * Se invoca con la sesión del operador y NO con la clave de servicio, para que
 * Postgres compruebe el rol por su cuenta en vez de creerle a esta capa.
 */
export async function deleteOrder(id: string): Promise<ActionResult> {
  await requireModerator()
  const supabase = await supabaseServer()

  const { data, error } = await supabase.rpc('delete_order', { p_order: id })
  if (error) return { ok: false, error: 'No se pudo borrar el pedido.' }
  if (!data?.ok) return { ok: false, error: 'Ese pedido ya no existe. Actualizá la lista.' }

  revalidatePath('/admin/pedidos')
  revalidatePath('/admin/productos')
  const devueltas = data.restored ?? 0
  return {
    ok: true,
    message: data.entregado
      ? `Pedido ${data.number} borrado. Estaba entregado, así que el stock no se tocó.`
      : `Pedido ${data.number} borrado. ${devueltas} ${devueltas === 1 ? 'unidad volvió' : 'unidades volvieron'} al stock.`,
  }
}

export async function setOrderNote(id: string, note: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('orders').update({ admin_note: note }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/pedidos')
  return { ok: true }
}

// ═══════════════════════════════════════════════ importar el catálogo inicial

/**
 * Vuelca el catálogo tipado del proyecto en la base.
 *
 * Se hace desde acá y no con un archivo SQL a propósito: el catálogo son 1.100
 * líneas de TypeScript con fichas técnicas y datos de compatibilidad. Copiarlas
 * a mano a un `insert` es garantía de que las dos copias se separen. Esto lee
 * la fuente real y la vuelca.
 *
 * Es idempotente: `upsert` por slug. Correrlo dos veces no duplica nada, y no
 * pisa las unidades que el operador haya cargado a mano salvo que se le pida.
 */
export async function importStaticCatalog(overwriteStock = false): Promise<ActionResult> {
  await requireAdmin()
  // Con la sesión del operador, NO con la clave de servicio: las políticas RLS
  // ya le permiten escribir en `products` y `categories`, así que saltárselas
  // sería un privilegio que esta tarea no necesita. Además deja el panel
  // funcionando aunque el despliegue no tenga configurada la clave de servicio.
  const supabase = await supabaseServer()

  const categorias = CATEGORY_ORDER.map((slug, i) => {
    const meta = CATEGORY_META[slug]
    return {
      slug,
      name_es: meta.name.es,
      name_pt: meta.name.pt,
      role_es: meta.role.es,
      role_pt: meta.role.pt,
      shape: meta.shape,
      sort_order: i + 1,
      active: true,
    }
  })

  const { error: errorCategorias } = await supabase
    .from('categories')
    .upsert(categorias, { onConflict: 'slug' })

  if (errorCategorias) return { ok: false, error: `Categorías: ${errorCategorias.message}` }

  const { data: existentes } = await supabase.from('products').select('slug, units')
  const stockActual = new Map((existentes ?? []).map((p) => [p.slug, p.units]))

  const productos = PRODUCTS.map((product) => ({
    slug: product.slug,
    ref: product.ref,
    name: product.name,
    brand: product.brand,
    model: product.model,
    category_slug: product.category,
    price_usd: product.priceUsd,
    list_price_usd: product.listPriceUsd ?? null,
    // El stock que ya cargó el operador manda sobre el del archivo.
    units:
      !overwriteStock && stockActual.has(product.slug)
        ? (stockActual.get(product.slug) ?? product.units)
        : product.units,
    arrived_recently: product.arrivedRecently ?? false,
    featured: product.featured ?? false,
    active: true,
    blurb_es: product.blurb.es,
    blurb_pt: product.blurb.pt,
    specs: product.specs,
    compat: product.compat,
    render: product.render,
  }))

  const { error } = await supabase.from('products').upsert(productos, { onConflict: 'slug' })
  if (error) return { ok: false, error: `Productos: ${error.message}` }

  revalidatePath('/admin/productos')
  revalidatePath('/', 'layout')
  return {
    ok: true,
    message: `Se importaron ${productos.length} productos y ${categorias.length} categorías.`,
  }
}

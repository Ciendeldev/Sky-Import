// PostgreSQL real y efímero. Nunca lee .env.local ni conecta a la tienda.
// Preparación: npm install --prefix tmp/pg-review embedded-postgres@17.6.0-beta.15 pg
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const runtime = createRequire(resolve('tmp/pg-review/package.json'))
const { default: EmbeddedPostgres } = await import(pathToFileURL(runtime.resolve('embedded-postgres')).href)
const db = new EmbeddedPostgres({
  databaseDir: resolve('tmp/pg-review', `cluster-${randomUUID()}`),
  port: 55439, user: 'postgres', password: randomUUID(), persistent: true,
  initdbFlags: ['--encoding=UTF8'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {}, onError: () => {},
})
const clients = []
let checks = 0
const ok = (message) => { checks++; console.log(`OK ${checks}: ${message}`) }

try {
  await db.initialise()
  await db.start()
  const client = db.getPgClient()
  clients.push(client)
  await client.connect()
  await client.query(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  `)
  const migrations = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()
  for (const name of migrations) await client.query(await readFile(`supabase/migrations/${name}`, 'utf8'))
  // Idempotencia de la migración nueva, sin volver a sembrar datos del negocio.
  await client.query(await readFile(`supabase/migrations/${migrations.at(-1)}`, 'utf8'))
  ok('todas las migraciones se aplican y la nueva admite repetición')

  const user = randomUUID()
  await client.query('insert into auth.users values ($1)', [user])
  await client.query("insert into admin_users(user_id, username) values ($1, 'qa')", [user])
  await client.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)", [user, JSON.stringify({ app_metadata: { panel_role: 'moderator' } })])
  await client.query(`
    insert into categories(slug, name_es, name_pt) values ('qa', 'QA', 'QA');
    insert into products(slug, ref, name, category_slug, price_usd, units)
    values ('qa-a', 'QA-A', 'QA A', 'qa', 100, 20), ('qa-b', 'QA-B', 'QA B', 'qa', 200, 20);
    insert into product_variants(product_id, sku, label_es, label_pt, units, attributes)
    select id, 'QA-V', 'Variante', 'Variante', 20, '{"Color":"Negro"}' from products where slug = 'qa-a';
  `)
  const customer = JSON.stringify({ first_name: 'QA', last_name: 'Local', phone: 'test', locale: 'es' })
  const place = async (connection, slug = 'qa-a', qty = 2, coupon = null, variant = slug === 'qa-a' ? 'QA-V' : null) => {
    const response = await connection.query("select place_order($1::jsonb, $2::jsonb, 'retiro-local', $3) as result", [JSON.stringify([{ slug, qty, variant_sku: variant }]), customer, coupon])
    const result = response.rows[0].result
    const { rows } = await connection.query('select id from orders where number = $1', [result.order_number])
    return { ...result, id: rows[0].id }
  }
  const stock = async () => (await client.query("select p.units as product, v.units as variant from products p join product_variants v on v.product_id = p.id where p.slug = 'qa-a'")).rows[0]
  const status = (id, value) => client.query('update orders set status = $2 where id = $1', [id, value])
  const remove = async (id) => (await client.query('select delete_order($1) as result', [id])).rows[0].result

  await assert.rejects(place(client, 'qa-a', 2, null, null), /Seleccioná una variante/)
  assert.deepEqual(await stock(), { product: 20, variant: 20 })
  ok('rechaza pedidos sin variante cuando el producto las exige, sin descontar stock')

  const order = await place(client)
  assert.deepEqual(await stock(), { product: 18, variant: 18 })
  await status(order.id, 'cancelado')
  assert.deepEqual(await stock(), { product: 20, variant: 20 })
  await status(order.id, 'cancelado')
  assert.deepEqual(await stock(), { product: 20, variant: 20 })
  ok('cancelar repone producto y variante una sola vez')
  await status(order.id, 'confirmado')
  assert.deepEqual(await stock(), { product: 18, variant: 18 })
  await status(order.id, 'cancelado')
  assert.equal((await remove(order.id)).restored, 0)
  assert.deepEqual(await stock(), { product: 20, variant: 20 })
  ok('reabrir reserva otra vez; cancelar y borrar no duplica unidades')

  const unavailable = await place(client)
  await status(unavailable.id, 'cancelado')
  await client.query("update product_variants set units = 0 where sku = 'QA-V'")
  await assert.rejects(status(unavailable.id, 'preparando'), /Sin stock suficiente/)
  assert.deepEqual(await stock(), { product: 20, variant: 0 })
  assert.deepEqual((await client.query('select status, stock_released from orders where id=$1', [unavailable.id])).rows[0], { status: 'cancelado', stock_released: true })
  await remove(unavailable.id)
  await client.query("update product_variants set units = 20 where sku = 'QA-V'")
  ok('reabrir sin stock revierte la transacción completa')

  const delivered = await place(client)
  await status(delivered.id, 'entregado')
  await assert.rejects(status(delivered.id, 'cancelado'), /entregado/)
  assert.equal((await remove(delivered.id)).restored, 0)
  assert.deepEqual(await stock(), { product: 18, variant: 18 })
  ok('entregados no se cancelan ni reponen stock al borrarlos')
  const pending = await place(client)
  assert.equal((await remove(pending.id)).restored, 2)
  assert.deepEqual(await stock(), { product: 18, variant: 18 })
  ok('borrar un pedido pendiente sigue devolviendo sus unidades')
  const direct = await place(client)
  await client.query('delete from orders where id=$1', [direct.id])
  assert.deepEqual(await stock(), { product: 18, variant: 18 })
  ok('el borrado directo también pasa por la restitución de stock')

  const variantOrder = await place(client)
  await status(variantOrder.id, 'cancelado')
  await client.query("update products set units = 0 where slug = 'qa-a'")
  await status(variantOrder.id, 'confirmado')
  assert.deepEqual(await stock(), { product: 0, variant: 16 })
  await remove(variantOrder.id)
  await client.query("update products set units = 18 where slug = 'qa-a'")
  ok('reabrir usa el stock de la variante aunque el contador base sea distinto')

  // Dos sesiones reales, productos distintos y una barrera sobre el cupón.
  // Ambas alcanzan el último uso antes de liberar la barrera.
  const connections = await Promise.all([1, 2].map(async () => {
    const connection = db.getPgClient(); clients.push(connection); await connection.connect()
    await connection.query('set statement_timeout = 15000')
    return connection
  }))
  await client.query("insert into coupons(code, kind, value, max_uses) values ('ULTIMO', 'percent', 10, 1)")
  await client.query('begin')
  await client.query("select id from coupons where code='ULTIMO' for update")
  const attempts = [place(connections[0], 'qa-a', 1, 'ULTIMO'), place(connections[1], 'qa-b', 1, 'ULTIMO')]
  // Conservar rechazos hasta inspeccionar ambos resultados.
  const resultsPromise = Promise.allSettled(attempts)
  const pids = connections.map((connection) => connection.processID)
  const deadline = Date.now() + 10000
  let waiting = 0
  while (Date.now() < deadline) {
    await client.query('select pg_stat_clear_snapshot()')
    waiting = Number((await client.query("select count(*) from pg_stat_activity where pid = any($1::int[]) and wait_event_type='Lock'", [pids])).rows[0].count)
    if (waiting === 2) break
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  await client.query('commit')
  assert.equal(waiting, 2, 'ambos pedidos compitieron realmente por el cupón')
  const results = await resultsPromise
  const orders = results.map((result) => { assert.equal(result.status, 'fulfilled', JSON.stringify(result)); return result.value })
  assert.equal(orders.filter((item) => item.discount_usd > 0).length, 1)
  assert.equal((await client.query("select used_count from coupons where code='ULTIMO'")).rows[0].used_count, 1)
  ok('dos compras simultáneas consumen exactamente un último uso del cupón')

  // PostgREST usa estos roles. La identidad se simula; RLS es la real.
  await client.query('grant usage on schema public, auth to anon, authenticated; grant all on all tables in schema public to anon, authenticated; grant all on all sequences in schema public to anon, authenticated')
  await client.query('set role anon')
  await client.query("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '{}', false)")
  assert.equal((await client.query("update orders set status='cancelado' returning id")).rowCount, 0)
  await assert.rejects(client.query('select delete_order($1)', [orders[0].id]), /permission denied/)
  await assert.rejects(client.query('select sync_order_stock()'), /permission denied/)
  await client.query('reset role')
  ok('el visitante no puede cancelar, borrar ni invocar el disparador')
  console.log(`${checks} comprobaciones de PostgreSQL aprobadas.`)
} finally {
  await Promise.allSettled(clients.map((client) => client.end()))
  await db.stop()
}

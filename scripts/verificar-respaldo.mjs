import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, relative, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

// Solo restaura en PostgreSQL local efímero; nunca acepta una URL remota.
if (!process.argv[2]) throw new Error('Uso: node scripts/verificar-respaldo.mjs RUTA_PRIVADA_DEL_RESPALDO')
const folder = resolve(process.argv[2])
const fromRepo = relative(resolve('.'), folder)
assert.ok(fromRepo.startsWith('..') || isAbsolute(fromRepo), 'Guardar el respaldo fuera del repositorio')
const raw = await readFile(`${folder}/snapshot.json`, 'utf8')
const snapshot = JSON.parse(raw, (key, value, context) => typeof value === 'number' && !Number.isSafeInteger(value) && Number.isInteger(value) ? context.source : value)
// El editor serializa los límites bigint como Number; se recupera el límite
// estándar del tipo, sin alterar valores de registros ni el contador actual.
for (const seq of snapshot.sequences) if (seq.data_type === 'bigint' && seq.max_value === '9223372036854776000') seq.max_value = '9223372036854775807'
assert.equal(snapshot.project, 'bhlkdinovdhtwxkkujic')
assert.equal(snapshot.format, 'sky-import-logical-snapshot-v1')
assert.ok(Date.now() - Date.parse(snapshot.captured_at) < 24 * 60 * 60 * 1000, 'La copia tiene más de 24 horas')
assert.equal(snapshot.data['storage.objects'].length, 0, 'Storage contiene archivos: respaldar también sus binarios antes de declarar éxito')
const qi = value => '"' + value.replaceAll('"', '""') + '"'
const qs = value => "'" + value.replaceAll("'", "''") + "'"
const full = name => name.split('.').map(qi).join('.')
const ddl = ['set timezone = \'UTC\';', 'create schema auth;']
const roles = new Set(['anon', 'authenticated', 'service_role'])
for (const policy of snapshot.policies) for (const role of policy.roles) if (role !== 'public') roles.add(role)
for (const grant of snapshot.grants) if (!['PUBLIC', 'postgres'].includes(grant.grantee)) roles.add(grant.grantee)
for (const role of roles) ddl.push(`create role ${qi(role)};`)
for (const e of snapshot.enums) ddl.push(`create type public.${qi(e.typname)} as enum (${e.labels.map(qs).join(',')});`)
for (const seq of snapshot.sequences) ddl.push(`create sequence public.${qi(seq.sequencename)} as ${seq.data_type} increment ${seq.increment_by} minvalue ${seq.min_value} maxvalue ${seq.max_value} start ${seq.start_value};`)
for (const def of snapshot.auth_helpers) ddl.push(def + ';')
const tables = [...new Set(snapshot.columns.map(c => `${c.schema}.${c.table}`))]
for (const table of tables) assert.ok(Array.isArray(snapshot.data[table]), `Faltan datos de ${table}`)
for (const table of tables) {
  const columns = snapshot.columns.filter(c => `${c.schema}.${c.table}` === table).sort((a,b) => a.position-b.position)
  ddl.push(`create table ${full(table)} (${columns.map(c => `${qi(c.name)} ${c.type}${c.generated ? ` generated always as (${c.default}) stored` : c.identity ? ` generated ${c.identity === 'a' ? 'always' : 'by default'} as identity` : c.default ? ` default ${c.default}` : ''}${c.not_null ? ' not null' : ''}`).join(',\n')});`)
}
// Auth se restaura como registros y estructura local; no emula el servicio GoTrue.
ddl.push('alter table auth.users add primary key(id);', 'alter table auth.identities add primary key(id);')
for (const table of tables) {
  const columns = snapshot.columns.filter(c => `${c.schema}.${c.table}` === table && !c.generated).sort((a,b) => a.position-b.position).map(c => qi(c.name)).join(',')
  ddl.push(`insert into ${full(table)} (${columns}) select ${columns} from jsonb_populate_recordset(null::${full(table)}, ${qs(JSON.stringify(snapshot.data[table]))}::jsonb);`)
}
for (const constraint of [...snapshot.constraints].sort((a,b) => Number(a.kind === 'f')-Number(b.kind === 'f'))) ddl.push(`alter table public.${qi(constraint.table)} add constraint ${qi(constraint.name)} ${constraint.definition};`)
const constraintNames = new Set(snapshot.constraints.map(c => c.name))
for (const index of snapshot.indexes) if (!constraintNames.has(index.indexname)) ddl.push(index.indexdef + ';')
ddl.push('set check_function_bodies = off;')
for (const func of snapshot.functions) ddl.push(func.definition + ';')
ddl.push('set check_function_bodies = on;')
for (const trigger of snapshot.triggers) ddl.push(trigger.definition + ';')
for (const p of snapshot.policies) ddl.push(`create policy ${qi(p.policyname)} on public.${qi(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(qi).join(',')}${p.qual ? ` using (${p.qual})` : ''}${p.with_check ? ` with check (${p.with_check})` : ''};`)
for (const r of snapshot.rls) ddl.push(`alter table public.${qi(r.table)} ${r.enabled ? 'enable' : 'disable'} row level security;${r.forced ? `alter table public.${qi(r.table)} force row level security;` : ''}`)
for (const grant of snapshot.grants) ddl.push(`grant ${grant.privilege_type} on public.${qi(grant.table_name)} to ${grant.grantee === 'PUBLIC' ? 'PUBLIC' : qi(grant.grantee)}${grant.is_grantable === 'YES' ? ' with grant option' : ''};`)
for (const func of snapshot.functions) {
  ddl.push(`revoke all on function public.${qi(func.name)}(${func.identity}) from public;`)
  for (const grant of snapshot.function_grants.filter(g => g.routine_name === func.name)) ddl.push(`grant execute on function public.${qi(func.name)}(${func.identity}) to ${grant.grantee === 'PUBLIC' ? 'PUBLIC' : qi(grant.grantee)}${grant.is_grantable === 'YES' ? ' with grant option' : ''};`)
}
for (const seq of snapshot.sequences) if (seq.last_value !== null) ddl.push(`select setval(${qs('public.' + qi(seq.sequencename))}, ${seq.last_value}, true);`)
for (const grant of snapshot.sequence_grants) ddl.push(`grant ${grant.privilege_type} on sequence public.${qi(grant.relname)} to ${grant.grantee === 'PUBLIC' ? 'PUBLIC' : qi(grant.grantee)}${grant.is_grantable ? ' with grant option' : ''};`)
await writeFile(`${folder}/restore-public-and-auth-records.sql`, ddl.join('\n'), 'utf8')
const runtime = createRequire(resolve('tmp/pg-review/package.json'))
const { default: EmbeddedPostgres } = await import(pathToFileURL(runtime.resolve('embedded-postgres')).href)
const db = new EmbeddedPostgres({ databaseDir: resolve('tmp/pg-review', `restore-${randomUUID()}`), port:55441, user:'postgres', password:randomUUID(), persistent:false, initdbFlags:['--encoding=UTF8'], postgresFlags:['-h','127.0.0.1'], onLog:()=>{}, onError:()=>{} })
let client
const report = { capturedAt:snapshot.captured_at, project:snapshot.project, sha256:createHash('sha256').update(raw).digest('hex'), tables:{}, checks:[], limitations:snapshot.excluded }
try {
  await db.initialise(); await db.start(); client=db.getPgClient(); await client.connect()
  for (const statement of ddl) await client.query(statement)
  for (const table of tables) {
    const { rows } = await client.query(`with expected as (select to_jsonb(x) row from jsonb_populate_recordset(null::${full(table)}, $1::jsonb) x), actual as (select to_jsonb(x) row from ${full(table)} x) select (select count(*) from actual)::int count, not exists((select row from expected except all select row from actual) union all (select row from actual except all select row from expected)) identical`, [JSON.stringify(snapshot.data[table])])
    assert.equal(rows[0].identical, true, table)
    report.tables[table]=rows[0].count
  }
  report.checks.push(`${tables.length} tablas restauradas; todos los registros idénticos, incluidos hashes de Auth y campos generados`)
  const policies = (await client.query("select count(*)::int n from pg_policies where schemaname='public'")).rows[0].n
  assert.equal(policies, snapshot.policies.length)
  report.checks.push(`${policies} políticas RLS restauradas, con índices, restricciones, funciones y triggers`)
  assert.equal((await client.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='orders' and column_name='stock_released'")).rows[0].n,1)
  assert.ok(snapshot.data['supabase_migrations.schema_migrations'].some(m => m.version === '20261019141606'))
  report.checks.push('Esquema vigente con stock_released e historial de migraciones conservado en snapshot.json')
  report.completedAt = new Date().toISOString()
  await writeFile(`${folder}/verification.json`,JSON.stringify(report,null,2))
  await copyFile('scripts/backup-snapshot.sql', `${folder}/backup-snapshot.sql`)
  await copyFile('scripts/verificar-respaldo.mjs', `${folder}/verificar-respaldo.mjs`)
  const hashes = {}
  for (const name of ['snapshot.json', 'restore-public-and-auth-records.sql', 'verification.json', 'backup-snapshot.sql', 'verificar-respaldo.mjs']) hashes[name] = createHash('sha256').update(await readFile(`${folder}/${name}`)).digest('hex')
  await writeFile(`${folder}/sha256.json`,JSON.stringify(hashes,null,2))
  console.log(JSON.stringify(report,null,2))
} catch (e) { console.error({message:e.message,code:e.code,table:e.table}); process.exitCode=1 }
finally { if(client) await client.end(); await db.stop() }

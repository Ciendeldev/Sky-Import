-- Solo lectura. Ejecutar en SQL Editor del proyecto bhlkdinovdhtwxkkujic.
-- Un único SELECT conserva una instantánea consistente entre tablas.
-- El resultado contiene datos de Auth: guardar únicamente en ubicaciones privadas.
select jsonb_build_object(
  'format','sky-import-logical-snapshot-v1',
  'project','bhlkdinovdhtwxkkujic',
  'captured_at',clock_timestamp(),
  'server_version',version(),
  'data',jsonb_build_object(
    'public.categories',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.categories x),
    'public.products',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.products x),
    'public.product_variants',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.product_variants x),
    'public.shipping_zones',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.shipping_zones x),
    'public.coupons',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.coupons x),
    'public.orders',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.orders x),
    'public.order_items',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.order_items x),
    'public.admin_users',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.admin_users x),
    'public.settings',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.settings x),
    'auth.users',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from auth.users x),
    'auth.identities',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from auth.identities x),
    'storage.buckets',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from storage.buckets x),
    'storage.objects',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from storage.objects x),
    'supabase_migrations.schema_migrations',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from supabase_migrations.schema_migrations x)
  ),
  'columns',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attnum>0 and not a.attisdropped and c.relkind='r' and (n.nspname='public' or(n.nspname='auth' and c.relname in('users','identities')))),
  'enums',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select t.typname,array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' group by t.typname)x),
  'constraints',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',co.conname,'kind',co.contype,'definition',pg_get_constraintdef(co.oid))) from pg_constraint co join pg_class c on c.oid=co.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
  'indexes',(select jsonb_agg(x) from pg_indexes x where schemaname='public'),
  'policies',(select jsonb_agg(x) from pg_policies x where schemaname='public'),
  'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'identity',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'acl',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'),
  'auth_helpers',(select jsonb_agg(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='auth' and p.proname in('uid','jwt','role','email')),
  'sequences',(select coalesce(jsonb_agg(jsonb_build_object('sequencename',sequencename,'data_type',data_type,'start_value',start_value::text,'min_value',min_value::text,'max_value',max_value::text,'increment_by',increment_by::text,'last_value',last_value::text)),'[]'::jsonb) from pg_sequences where schemaname='public'),
  'rls',(select jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity,'forced',c.relforcerowsecurity,'acl',c.relacl)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'grants',(select jsonb_agg(x) from information_schema.role_table_grants x where table_schema='public'),
  'function_grants',(select jsonb_agg(x) from information_schema.role_routine_grants x where routine_schema='public'),
  'sequence_grants',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select c.relname,case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end grantee,a.privilege_type,a.is_grantable from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('S',c.relowner)))a where n.nspname='public' and c.relkind='S')x),
  'roles',(select jsonb_agg(rolname) from pg_roles),
  'triggers',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),
  'excluded','Auth sessions, refresh tokens, MFA and provider configuration; deployment secrets; Storage binaries. Requires an existing Supabase service for a full platform recovery.'
) as backup;

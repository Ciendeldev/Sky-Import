-- ═══════════════════════════════════════════════════════════════════════════
-- SKY IMPORT — esquema inicial
--
-- Reglas que este esquema respeta y que conviene no romper:
--
--  1. El USD es la fuente de verdad de todo precio. Guaraní y real se DERIVAN
--     con la tasa de `settings`. No hay una segunda columna de precio en Gs.
--     que se pueda contradecir con la de dólares.
--  2. La disponibilidad se DERIVA de `units`. No existe ningún campo «agotado»
--     que pueda quedar desincronizado del stock real.
--  3. Todo texto que ve el cliente existe en los dos idiomas (`_es` y `_pt`).
--  4. Un pedido guarda el nombre, el SKU y el precio del momento en que se hizo.
--     Si mañana cambia el catálogo, el pedido viejo sigue diciendo la verdad.
--  5. RLS activo en todas las tablas. Lo público se lee sin sesión; escribir
--     exige ser administrador.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────── tipos

do $$ begin
  create type coupon_kind as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  -- El primer estado es el que deja el checkout. Los demás los mueve el operador.
  create type order_status as enum (
    'iniciado_whatsapp',
    'confirmado',
    'preparando',
    'entregado',
    'cancelado'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────── quién es admin

-- La sesión la gestiona Supabase Auth. Esta tabla dice cuál de esos usuarios
-- puede administrar. Se consulta desde las políticas RLS, así que es la única
-- puerta: sin fila acá, ninguna política de escritura deja pasar.
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  full_name  text,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Usuarios de Supabase Auth habilitados para administrar. La contraseña vive en auth.users, nunca acá.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────── categorías

create table if not exists public.categories (
  slug       text primary key,
  name_es    text not null,
  name_pt    text not null,
  role_es    text not null default '',
  role_pt    text not null default '',
  -- Silueta del dibujo vectorial que representa la categoría.
  shape      text not null default 'accessory',
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_orden_idx on public.categories (sort_order);

-- ───────────────────────────────────────────────────────────── productos

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  -- Código de referencia interno, estable y dictable por teléfono.
  ref             text not null unique,
  name            text not null,
  brand           text not null default '',
  model           text not null default '',
  category_slug   text not null references public.categories(slug) on update cascade,

  -- Precio de venta en USD: la fuente de verdad de las tres monedas.
  price_usd       numeric(12, 2) not null check (price_usd >= 0),
  -- Precio anterior. Si existe y es mayor, la oferta se DERIVA de la diferencia.
  list_price_usd  numeric(12, 2) check (list_price_usd is null or list_price_usd >= 0),

  -- Unidades del producto base. Con variantes activas, manda la suma de ellas.
  units           integer not null default 0 check (units >= 0),
  -- Umbral propio de este producto; si es null se usa el global de `settings`.
  min_stock       integer check (min_stock is null or min_stock >= 0),

  arrived_recently boolean not null default false,
  featured         boolean not null default false,
  active           boolean not null default true,

  blurb_es        text not null default '',
  blurb_pt        text not null default '',

  -- Ficha técnica: [{ "label": {"es","pt"}, "value": string | {"es","pt"} }]
  specs           jsonb not null default '[]'::jsonb,
  -- Ficha de compatibilidad que consume el configurador. Tipo discriminado por `kind`.
  compat          jsonb not null default '{"kind":"accessory"}'::jsonb,
  -- Cómo se dibuja el render vectorial: { shape, accent, seed, variant, fans }
  render          jsonb not null default '{}'::jsonb,
  -- Imágenes del producto, en orden. [{ "url", "alt_es", "alt_pt" }]
  images          jsonb not null default '[]'::jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_categoria_idx on public.products (category_slug);
create index if not exists products_activo_idx    on public.products (active);
create index if not exists products_destacado_idx on public.products (featured) where featured;
create index if not exists products_specs_idx     on public.products using gin (specs);

comment on column public.products.units is
  'Única fuente de la disponibilidad. 0 = agotado. No existe un campo «agotado» separado.';

-- ────────────────────────────────────────────────────────────── variantes

-- Los ejes son abiertos a propósito: en componentes de PC una variante es
-- capacidad, velocidad, formato, color del gabinete o largo del radiador — no
-- «talla». `attributes` guarda los ejes de ESTE producto, sin columnas fijas
-- que queden vacías para la mitad del catálogo.
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  sku         text not null unique,
  label_es    text not null,
  label_pt    text not null,
  -- { "Capacidad": "2 TB", "Color": "Negro" } — ejes propios de la pieza.
  attributes  jsonb not null default '{}'::jsonb,
  -- Precio propio de la variante. Si es null, hereda el del producto.
  price_usd   numeric(12, 2) check (price_usd is null or price_usd >= 0),
  units       integer not null default 0 check (units >= 0),
  -- Imagen propia: cambiar de variante cambia la foto.
  image_url   text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists variants_producto_idx on public.product_variants (product_id, sort_order);

-- ──────────────────────────────────────────────────────── zonas de envío

create table if not exists public.shipping_zones (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name_es       text not null,
  name_pt       text not null,
  note_es       text not null default '',
  note_pt       text not null default '',
  cost_usd      numeric(12, 2) not null default 0 check (cost_usd >= 0),
  -- Envío bonificado a partir de este neto. Null = nunca gratis por monto.
  free_over_usd numeric(12, 2) check (free_over_usd is null or free_over_usd >= 0),
  -- El retiro en local no pide dirección.
  requires_address boolean not null default true,
  sort_order    integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────── cupones

create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  kind             coupon_kind not null,
  -- Porcentaje (1–100) si kind = percent; monto en USD si kind = fixed.
  value            numeric(12, 2) not null check (value > 0),
  min_purchase_usd numeric(12, 2) not null default 0 check (min_purchase_usd >= 0),
  starts_at        timestamptz,
  expires_at       timestamptz,
  -- Null = sin límite de usos.
  max_uses         integer check (max_uses is null or max_uses > 0),
  used_count       integer not null default 0 check (used_count >= 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint cupon_porcentaje_valido
    check (kind <> 'percent' or value <= 100),
  constraint cupon_ventana_valida
    check (starts_at is null or expires_at is null or expires_at > starts_at)
);

create unique index if not exists coupons_code_upper_idx on public.coupons (upper(code));

-- ─────────────────────────────────────────────────────────────── pedidos

create sequence if not exists public.order_number_seq start 1000;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  -- Número corto y dictable: SI-1000, SI-1001…
  number         text not null unique default ('SI-' || nextval('public.order_number_seq')::text),
  status         order_status not null default 'iniciado_whatsapp',

  first_name     text not null,
  last_name      text not null,
  phone          text not null,

  zone_slug      text references public.shipping_zones(slug) on update cascade,
  zone_name      text not null default '',
  address        text not null default '',
  notes          text not null default '',

  coupon_code    text,
  subtotal_usd   numeric(12, 2) not null default 0,
  discount_usd   numeric(12, 2) not null default 0,
  shipping_usd   numeric(12, 2) not null default 0,
  total_usd      numeric(12, 2) not null default 0,

  -- Tasa con la que se convirtió a guaraníes EN ESE MOMENTO. Si mañana cambia,
  -- el pedido viejo sigue explicando sus propios números.
  fx_pyg         numeric(12, 2) not null,
  total_pyg      numeric(14, 0) not null default 0,

  locale         text not null default 'es',
  -- Nota interna del operador; nunca la ve el cliente.
  admin_note     text not null default '',

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_estado_idx on public.orders (status, created_at desc);
create index if not exists orders_fecha_idx  on public.orders (created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  -- Referencias débiles a propósito: si el producto se borra, la línea sobrevive.
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,

  -- Copia del momento de la compra. Es la que se imprime, no la del catálogo.
  sku           text not null,
  name          text not null,
  variant_label text not null default '',
  qty           integer not null check (qty > 0),
  unit_price_usd numeric(12, 2) not null check (unit_price_usd >= 0),
  subtotal_usd  numeric(12, 2) not null check (subtotal_usd >= 0),

  created_at    timestamptz not null default now()
);

create index if not exists order_items_pedido_idx on public.order_items (order_id);

-- ────────────────────────────────────────────────────── configuración

-- Clave/valor para lo que el operador cambia sin tocar código: tasa de cambio,
-- umbrales comerciales, contacto. Una fila por clave.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- ─────────────────────────────────────────────── marca de tiempo automática

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_variants',
    'shipping_zones', 'coupons', 'orders', 'settings'
  ] loop
    execute format(
      'drop trigger if exists %I on public.%I', 'touch_' || t, t
    );
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.touch_updated_at()',
      'touch_' || t, t
    );
  end loop;
end $$;

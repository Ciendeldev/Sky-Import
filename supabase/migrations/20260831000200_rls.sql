-- ═══════════════════════════════════════════════════════════════════════════
-- SEGURIDAD A NIVEL DE FILA
--
-- Modelo mental, en una línea: la tienda es un escaparate público de LECTURA,
-- y todo lo demás exige ser administrador.
--
--   · Catálogo, categorías y zonas de envío  → lectura pública SOLO de lo activo.
--   · Cupones                                → NADIE los lee desde el navegador.
--     Se validan con una función `security definer` que devuelve el descuento
--     calculado y nunca la lista de códigos.
--   · Pedidos                                → se crean con una función, no con
--     un INSERT abierto: así el cliente no puede inventarse el total.
--   · Configuración                          → lectura pública de las claves
--     públicas (tasa de cambio), escritura solo admin.
--
-- La clave `service_role` salta todo esto por diseño de Supabase: por eso vive
-- únicamente en el servidor y jamás en un componente de cliente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.admin_users      enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.shipping_zones   enable row level security;
alter table public.coupons          enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.settings         enable row level security;

-- ───────────────────────────────────────────────────────────── admin_users

drop policy if exists admin_users_lee_lo_suyo on public.admin_users;
create policy admin_users_lee_lo_suyo on public.admin_users
  for select using (user_id = auth.uid() or public.is_admin());

-- Nadie se da de alta a sí mismo como admin desde la aplicación. Se hace con
-- la clave de servicio, desde el script de aprovisionamiento.

-- ───────────────────────────────────────────────────────────── categorías

drop policy if exists categorias_lectura_publica on public.categories;
create policy categorias_lectura_publica on public.categories
  for select using (active);

drop policy if exists categorias_admin on public.categories;
create policy categorias_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────────── productos

drop policy if exists productos_lectura_publica on public.products;
create policy productos_lectura_publica on public.products
  for select using (active);

drop policy if exists productos_admin on public.products;
create policy productos_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists variantes_lectura_publica on public.product_variants;
create policy variantes_lectura_publica on public.product_variants
  for select using (
    active and exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.active
    )
  );

drop policy if exists variantes_admin on public.product_variants;
create policy variantes_admin on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────── zonas de envío

drop policy if exists zonas_lectura_publica on public.shipping_zones;
create policy zonas_lectura_publica on public.shipping_zones
  for select using (active);

drop policy if exists zonas_admin on public.shipping_zones;
create policy zonas_admin on public.shipping_zones
  for all using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────── cupones

-- Sin política de lectura pública: un cliente no puede enumerar los códigos.
drop policy if exists cupones_admin on public.coupons;
create policy cupones_admin on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────── pedidos

drop policy if exists pedidos_admin on public.orders;
create policy pedidos_admin on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists lineas_admin on public.order_items;
create policy lineas_admin on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────── configuración

-- Solo las claves marcadas como públicas se leen sin sesión. La tasa de cambio
-- es pública; cualquier cosa que se agregue mañana no lo es por descuido.
drop policy if exists settings_lectura_publica on public.settings;
create policy settings_lectura_publica on public.settings
  for select using (key in ('fx', 'rules', 'contact'));

drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════ funciones públicas

-- ── validar un cupón sin revelar el catálogo de cupones ──
--
-- Devuelve el descuento YA CALCULADO en USD, o el motivo del rechazo. El
-- navegador nunca ve `value`, `max_uses` ni la existencia de otros códigos.
create or replace function public.validate_coupon(
  p_code text,
  p_subtotal_usd numeric
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  descuento numeric(12, 2);
begin
  select * into c from public.coupons
  where upper(code) = upper(trim(p_code))
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if not c.active then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('ok', false, 'reason', 'not_started');
  end if;

  if c.expires_at is not null and now() > c.expires_at then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if c.max_uses is not null and c.used_count >= c.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'exhausted');
  end if;

  if p_subtotal_usd < c.min_purchase_usd then
    return jsonb_build_object(
      'ok', false,
      'reason', 'below_minimum',
      'min_purchase_usd', c.min_purchase_usd
    );
  end if;

  descuento := case
    when c.kind = 'percent' then round(p_subtotal_usd * c.value / 100, 2)
    else least(c.value, p_subtotal_usd)
  end;

  return jsonb_build_object(
    'ok', true,
    'code', c.code,
    'kind', c.kind,
    'value', c.value,
    'discount_usd', descuento
  );
end;
$$;

revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- ── registrar un pedido ──
--
-- El cliente manda QUÉ pide, no CUÁNTO cuesta: los precios se releen del
-- catálogo acá dentro. Es lo que impide que alguien edite el total en el
-- navegador y mande un pedido de un dólar.
--
-- Descuenta stock en la misma transacción. Si una pieza no alcanza, el pedido
-- entero falla y no queda a medias.
create or replace function public.place_order(
  p_items jsonb,           -- [{ "slug": "...", "variant_sku": "..."|null, "qty": 2 }]
  p_customer jsonb,        -- { first_name, last_name, phone, address, notes, locale }
  p_zone_slug text,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  item          jsonb;
  prod          public.products%rowtype;
  var           public.product_variants%rowtype;
  zona          public.shipping_zones%rowtype;
  cupon         jsonb;
  nuevo_pedido  public.orders%rowtype;
  precio        numeric(12, 2);
  cantidad      integer;
  disponible    integer;
  sku_linea     text;
  etiqueta      text;
  subtotal      numeric(12, 2) := 0;
  descuento     numeric(12, 2) := 0;
  envio         numeric(12, 2) := 0;
  tasa          numeric(12, 2);
  lineas        jsonb := '[]'::jsonb;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'El pedido no tiene líneas' using errcode = 'check_violation';
  end if;

  if coalesce(trim(p_customer ->> 'first_name'), '') = ''
     or coalesce(trim(p_customer ->> 'last_name'), '') = ''
     or coalesce(trim(p_customer ->> 'phone'), '') = '' then
    raise exception 'Faltan datos de contacto' using errcode = 'check_violation';
  end if;

  select * into zona from public.shipping_zones
  where slug = p_zone_slug and active;
  if not found then
    raise exception 'Zona de envío desconocida: %', p_zone_slug using errcode = 'check_violation';
  end if;

  -- 1 · Releer precios y reservar stock, línea por línea.
  for item in select * from jsonb_array_elements(p_items) loop
    cantidad := greatest(1, coalesce((item ->> 'qty')::integer, 1));

    select * into prod from public.products
    where slug = item ->> 'slug' and active
    for update;
    if not found then
      raise exception 'Producto no disponible: %', item ->> 'slug' using errcode = 'check_violation';
    end if;

    if coalesce(item ->> 'variant_sku', '') <> '' then
      select * into var from public.product_variants
      where sku = item ->> 'variant_sku' and product_id = prod.id and active
      for update;
      if not found then
        raise exception 'Variante no disponible: %', item ->> 'variant_sku' using errcode = 'check_violation';
      end if;
      precio     := coalesce(var.price_usd, prod.price_usd);
      disponible := var.units;
      sku_linea  := var.sku;
      etiqueta   := case when p_customer ->> 'locale' = 'pt' then var.label_pt else var.label_es end;
    else
      precio     := prod.price_usd;
      disponible := prod.units;
      sku_linea  := prod.ref;
      etiqueta   := '';
    end if;

    if disponible < cantidad then
      raise exception 'Sin stock suficiente de %: quedan %', prod.name, disponible
        using errcode = 'check_violation';
    end if;

    if coalesce(item ->> 'variant_sku', '') <> '' then
      update public.product_variants set units = units - cantidad where id = var.id;
    end if;
    update public.products set units = greatest(0, units - cantidad) where id = prod.id;

    subtotal := subtotal + (precio * cantidad);
    lineas := lineas || jsonb_build_array(jsonb_build_object(
      'product_id',     prod.id,
      'variant_id',     case when coalesce(item ->> 'variant_sku', '') <> '' then var.id else null end,
      'sku',            sku_linea,
      'name',           prod.name,
      'variant_label',  coalesce(etiqueta, ''),
      'qty',            cantidad,
      'unit_price_usd', precio,
      'subtotal_usd',   precio * cantidad
    ));
  end loop;

  -- 2 · Cupón, si vino uno y si de verdad aplica.
  if coalesce(trim(p_coupon_code), '') <> '' then
    cupon := public.validate_coupon(p_coupon_code, subtotal);
    if (cupon ->> 'ok')::boolean then
      descuento := (cupon ->> 'discount_usd')::numeric;
      update public.coupons
         set used_count = used_count + 1
       where upper(code) = upper(trim(p_coupon_code));
    end if;
  end if;

  -- 3 · Envío: la bonificación se mide contra el neto ya descontado.
  envio := case
    when zona.free_over_usd is not null and (subtotal - descuento) >= zona.free_over_usd then 0
    else zona.cost_usd
  end;

  -- 4 · La tasa del momento queda grabada en el pedido.
  select coalesce((value ->> 'PYG')::numeric, 7400) into tasa
  from public.settings where key = 'fx';
  tasa := coalesce(tasa, 7400);

  insert into public.orders (
    first_name, last_name, phone,
    zone_slug, zone_name, address, notes,
    coupon_code, subtotal_usd, discount_usd, shipping_usd, total_usd,
    fx_pyg, total_pyg, locale
  ) values (
    trim(p_customer ->> 'first_name'),
    trim(p_customer ->> 'last_name'),
    trim(p_customer ->> 'phone'),
    zona.slug,
    case when p_customer ->> 'locale' = 'pt' then zona.name_pt else zona.name_es end,
    coalesce(trim(p_customer ->> 'address'), ''),
    coalesce(trim(p_customer ->> 'notes'), ''),
    case when descuento > 0 then upper(trim(p_coupon_code)) else null end,
    subtotal, descuento, envio, subtotal - descuento + envio,
    tasa,
    round((subtotal - descuento + envio) * tasa / 1000) * 1000,
    coalesce(p_customer ->> 'locale', 'es')
  )
  returning * into nuevo_pedido;

  insert into public.order_items (
    order_id, product_id, variant_id, sku, name, variant_label,
    qty, unit_price_usd, subtotal_usd
  )
  select
    nuevo_pedido.id,
    (l ->> 'product_id')::uuid,
    nullif(l ->> 'variant_id', '')::uuid,
    l ->> 'sku',
    l ->> 'name',
    l ->> 'variant_label',
    (l ->> 'qty')::integer,
    (l ->> 'unit_price_usd')::numeric,
    (l ->> 'subtotal_usd')::numeric
  from jsonb_array_elements(lineas) as l;

  return jsonb_build_object(
    'ok',           true,
    'order_number', nuevo_pedido.number,
    'subtotal_usd', nuevo_pedido.subtotal_usd,
    'discount_usd', nuevo_pedido.discount_usd,
    'shipping_usd', nuevo_pedido.shipping_usd,
    'total_usd',    nuevo_pedido.total_usd,
    'total_pyg',    nuevo_pedido.total_pyg,
    'fx_pyg',       nuevo_pedido.fx_pyg
  );
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

-- Cancelar libera la reserva; reabrir la vuelve a tomar de forma atómica.
-- La marca distingue los cancelados históricos que todavía retenían unidades.
alter table public.orders add column if not exists stock_released boolean not null default false;

create or replace function public.sync_order_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  devolver boolean;
  linea record;
  disponibles integer;
begin
  if tg_op = 'UPDATE' then
    new.stock_released := old.stock_released;
    -- Una entrega no equivale a una reserva: no se inventa mercadería al
    -- cancelar algo que ya salió. Las devoluciones requieren otro proceso.
    if old.status = 'entregado' and new.status <> old.status then
      raise exception 'Un pedido entregado no puede cambiar de estado' using errcode = 'check_violation';
    end if;
    if new.status = 'cancelado' and not old.stock_released then
      devolver := true;
    elsif new.status <> 'cancelado' and old.stock_released then
      devolver := false;
    else
      return new;
    end if;
  else
    if old.status = 'entregado' or old.stock_released then return old; end if;
    devolver := true;
  end if;

  -- Comparte con place_order el orden por slug de los productos y adquiere
  -- esos bloqueos antes de las variantes. Agrupar suma las líneas repetidas.
  for linea in
    select p.id, p.name, sum(i.qty)::integer as qty,
      coalesce(sum(i.qty) filter (where i.variant_id is null), 0)::integer as base_qty
    from public.order_items i join public.products p on p.id = i.product_id
    where i.order_id = old.id
    group by p.id order by p.slug
  loop
    select units into disponibles from public.products where id = linea.id for update;
    if not devolver and disponibles < linea.base_qty then
      raise exception 'Sin stock suficiente de %: quedan %', linea.name, disponibles using errcode = 'check_violation';
    end if;
    -- Las líneas con variante se validan contra su propio stock, como place_order.
    update public.products set units = greatest(0, units + case when devolver then linea.qty else -linea.qty end)
    where id = linea.id;
  end loop;
  for linea in
    select v.id, v.sku, sum(i.qty)::integer as qty
    from public.order_items i join public.product_variants v on v.id = i.variant_id
    where i.order_id = old.id
    group by v.id order by v.sku
  loop
    select units into disponibles from public.product_variants where id = linea.id for update;
    if not devolver and disponibles < linea.qty then
      raise exception 'Sin stock suficiente de %: quedan %', linea.sku, disponibles using errcode = 'check_violation';
    end if;
    update public.product_variants set units = units + case when devolver then linea.qty else -linea.qty end
    where id = linea.id;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  new.stock_released := devolver;
  return new;
end;
$$;
revoke all on function public.sync_order_stock() from public, anon, authenticated;

drop trigger if exists sync_order_stock on public.orders;
create trigger sync_order_stock before update of status, stock_released or delete on public.orders
for each row execute function public.sync_order_stock();

-- El disparador también protege borrados directos autorizados por RLS.
-- La RPC conserva el contrato y ya no repone por su cuenta.
create or replace function public.delete_order(p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pedido public.orders%rowtype;
  devueltas integer := 0;
begin
  if not public.is_moderator() then raise exception 'NO_AUTORIZADO'; end if;
  select * into pedido from public.orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NO_EXISTE'); end if;
  if pedido.status <> 'entregado' and not pedido.stock_released then
    select coalesce(sum(qty), 0)::integer into devueltas from public.order_items where order_id = p_order;
  end if;
  delete from public.orders where id = p_order;
  return jsonb_build_object('ok', true, 'number', pedido.number, 'restored', devueltas, 'entregado', pedido.status = 'entregado');
end;
$$;
revoke all on function public.delete_order(uuid) from public, anon;
grant execute on function public.delete_order(uuid) to authenticated;

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
  for item in select * from jsonb_array_elements(p_items) order by value ->> 'slug', value ->> 'variant_sku' loop
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
      if exists (select 1 from public.product_variants where product_id = prod.id and active) then
        raise exception 'Seleccioná una variante de %', prod.name using errcode = 'check_violation';
      end if;
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
    -- El bloqueo se obtiene ANTES de validar: otro pedido debe ver el contador
    -- ya actualizado cuando termine de esperar, incluso si compra otra pieza.
    perform 1 from public.coupons
    where upper(code) = upper(trim(p_coupon_code)) for update;
    cupon := public.validate_coupon(p_coupon_code, subtotal);
    if (cupon ->> 'ok')::boolean then
      descuento := (cupon ->> 'discount_usd')::numeric;
      update public.coupons
         set used_count = used_count + 1
       where upper(code) = upper(trim(p_coupon_code));
    end if;
  end if;

  -- 3 · Envío: siempre cero.
  --
  --     No es que sea gratis: es que TODAVÍA NO TIENE PRECIO. El flete
  --     depende del peso, del volumen y del destino —no cuesta lo mismo un
  --     tubo de pasta térmica que un gabinete ATX, ni llega igual a Luque que
  --     a un pueblo del Chaco— y la tienda no puede saberlo antes de ver el
  --     pedido armado. Se acuerda en la misma conversación de WhatsApp donde
  --     se cierra la venta, y hasta entonces el pedido guarda el total de las
  --     piezas y nada más. Ninguna pantalla enseña un importe de envío.
  envio := 0;

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
    'fx_pyg',       nuevo_pedido.fx_pyg,
    -- 5 · Las líneas tal como quedaron grabadas, para que el mensaje de
    --     WhatsApp las copie en vez de recalcularlas en el navegador.
    'lines', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'sku',            l ->> 'sku',
        'name',           l ->> 'name',
        'variant_label',  l ->> 'variant_label',
        'qty',            (l ->> 'qty')::integer,
        'unit_price_usd', (l ->> 'unit_price_usd')::numeric,
        'subtotal_usd',   (l ->> 'subtotal_usd')::numeric
      ) order by ord), '[]'::jsonb)
      from jsonb_array_elements(lineas) with ordinality as t(l, ord)
    )
  );
end;
$$;

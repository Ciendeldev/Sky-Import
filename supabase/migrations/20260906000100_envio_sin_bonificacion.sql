-- ═══════════════════════════════════════════════════════════════════════════
-- EL ENVÍO SE ACUERDA POR WHATSAPP
--
-- Hasta acá el envío tenía dos números por zona: un costo fijo y un umbral,
-- `free_over_usd`, por encima del cual pasaba a cero y la tienda anunciaba
-- «¡Gratis!». Las dos cosas estaban mal.
--
-- «Gratis» es al revés de como funciona el negocio: cuanto más grande el
-- bulto, más caro el transporte, y prometerlo en un pedido de veinticuatro
-- millones de guaraníes es una promesa que el local no puede sostener. Y el
-- costo fijo tampoco existe: el flete desde Ciudad del Este depende del peso,
-- del volumen y del destino, y no hay forma de saberlo antes de ver el pedido.
--
-- Así que no hay número. El envío se cierra en la conversación de WhatsApp,
-- que es donde se cierra todo lo demás, y ninguna pantalla enseña un importe.
--
-- `free_over_usd` se elimina. `cost_usd` se vacía y se deja de leer: se
-- conserva la columna porque borrarla es irreversible y no molesta estando en
-- NULL, pero el comentario la marca como muerta para que nadie la reutilice.
--
-- `place_order` se reescribe ENTERA a propósito: es la copia literal de la
-- versión anterior con el bloque 3 cambiado y nada más. Bloqueo de filas,
-- validaciones y forma del error quedan idénticos, porque de eso depende el
-- checkout y no es lo que se está corrigiendo acá.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.shipping_zones drop column if exists free_over_usd;

alter table public.shipping_zones alter column cost_usd drop not null;
alter table public.shipping_zones alter column cost_usd drop default;
update public.shipping_zones set cost_usd = null;

comment on column public.shipping_zones.cost_usd is
  'MUERTA. El envío no tiene importe: se acuerda por WhatsApp. Se conserva en NULL para no hacer irreversible el cambio; ningún código la lee.';

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
    'fx_pyg',       nuevo_pedido.fx_pyg
  );
end;
$$;

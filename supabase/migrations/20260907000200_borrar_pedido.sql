-- ═══════════════════════════════════════════════════════════════════════════
-- BORRAR UN PEDIDO DEVOLVIENDO EL STOCK
--
-- El panel registraba pedidos y no sabía darlos de baja. Durante las pruebas
-- se acumulan registros que no fueron ventas, y no había forma de limpiarlos
-- sin entrar a la base a mano.
--
-- Un `delete` pelado no alcanza: `place_order` descuenta `units` al registrar
-- el pedido, así que borrar la fila sin devolver esas unidades deja el
-- inventario mintiendo para siempre —y la disponibilidad de esta tienda SE
-- DERIVA de `units`, no hay campo «agotado» que corrija a mano.
--
-- Va en una función y no en el código de la aplicación por dos razones: el
-- bloqueo de fila y el borrado tienen que ocurrir en la misma transacción, y
-- así la base misma comprueba quién llama en vez de confiar en que la pantalla
-- haya escondido el botón.
-- ═══════════════════════════════════════════════════════════════════════════

-- El rol vive en `app_metadata`, que solo escribe la clave de servicio. Acá se
-- lee del JWT ya verificado por la puerta de entrada, no de una tabla editable.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_admin()
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'panel_role', '') = 'moderator';
$$;

comment on function public.is_moderator is
  'Administrador vigente Y con panel_role=moderator en app_metadata. Gobierna las operaciones destructivas.';

create or replace function public.delete_order(p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  pedido    public.orders%rowtype;
  linea     record;
  devueltas integer := 0;
begin
  if not public.is_moderator() then
    raise exception 'NO_AUTORIZADO';
  end if;

  -- `for update` porque entre leer el pedido y devolver sus unidades no puede
  -- colarse otra operación sobre las mismas filas.
  select * into pedido from public.orders where id = p_order for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_EXISTE');
  end if;

  -- Si el pedido ya se entregó, la mercadería salió del local de verdad:
  -- devolver esas unidades inventaría stock que no existe en el estante.
  if pedido.status <> 'entregado' then
    for linea in
      select product_id, variant_id, qty from public.order_items where order_id = p_order
    loop
      if linea.variant_id is not null then
        update public.product_variants set units = units + linea.qty where id = linea.variant_id;
      end if;
      if linea.product_id is not null then
        update public.products set units = units + linea.qty where id = linea.product_id;
      end if;
      devueltas := devueltas + linea.qty;
    end loop;
  end if;

  -- Las líneas se van solas: `order_items` referencia con on delete cascade.
  delete from public.orders where id = p_order;

  return jsonb_build_object(
    'ok', true,
    'number', pedido.number,
    'restored', devueltas,
    'entregado', pedido.status = 'entregado'
  );
end;
$$;

revoke all on function public.delete_order(uuid) from public, anon;
grant execute on function public.delete_order(uuid) to authenticated;

-- La política vieja daba `for all` a cualquier administrador, así que el
-- borrado quedaba abierto aunque la pantalla no lo ofreciera. Se separa para
-- que «solo el moderador borra» sea cierto también fuera de la aplicación.
drop policy if exists pedidos_admin on public.orders;

drop policy if exists pedidos_lee_admin on public.orders;
create policy pedidos_lee_admin on public.orders
  for select using (public.is_admin());

drop policy if exists pedidos_crea_admin on public.orders;
create policy pedidos_crea_admin on public.orders
  for insert with check (public.is_admin());

drop policy if exists pedidos_edita_admin on public.orders;
create policy pedidos_edita_admin on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists pedidos_borra_moderador on public.orders;
create policy pedidos_borra_moderador on public.orders
  for delete using (public.is_moderator());

-- ═══════════════════════════════════════════════════════════════════════════
-- ZONAS DE ENTREGA POR CIUDAD
--
-- Las tres zonas originales —«Gran Asunción», «Interior», «Retiro»— venían del
-- modelo de una tienda de Asunción. Sky Import está en CIUDAD DEL ESTE: sus
-- clientes son de Alto Paraná y de la triple frontera, no del Área
-- Metropolitana de Asunción.
--
-- Ahora cada ciudad es su propia zona, con su costo. El cliente elige la suya
-- de una lista en vez de adivinar en cuál de tres cajones entra, y el operador
-- edita los costos sin tocar código.
--
-- El costo es una estimación de partida: se ajusta desde el panel.
-- ═══════════════════════════════════════════════════════════════════════════

-- Las zonas viejas se desactivan en lugar de borrarse: hay pedidos que las
-- referencian y su nombre quedó grabado en cada uno.
update public.shipping_zones
   set active = false
 where slug in ('gran-asuncion', 'interior');

insert into public.shipping_zones
  (slug, name_es, name_pt, note_es, note_pt, cost_usd, free_over_usd, requires_address, sort_order)
values
  -- ── retiro ──
  ('retiro-local', 'Retiro en el local', 'Retirada na loja',
   'Ciudad del Este. Coordinamos horario por WhatsApp.',
   'Ciudad del Este. Combinamos o horário pelo WhatsApp.',
   0, null, false, 1),

  -- ── Alto Paraná: el radio propio de la casa ──
  ('ciudad-del-este', 'Ciudad del Este', 'Ciudad del Este',
   'Entrega dentro de la ciudad, coordinada por WhatsApp.',
   'Entrega dentro da cidade, combinada pelo WhatsApp.',
   3, 200, true, 2),

  ('hernandarias', 'Hernandarias', 'Hernandarias',
   'Alto Paraná. Entrega coordinada por WhatsApp.',
   'Alto Paraná. Entrega combinada pelo WhatsApp.',
   4, 250, true, 3),

  ('presidente-franco', 'Presidente Franco', 'Presidente Franco',
   'Alto Paraná. Entrega coordinada por WhatsApp.',
   'Alto Paraná. Entrega combinada pelo WhatsApp.',
   4, 250, true, 4),

  ('minga-guazu', 'Minga Guazú', 'Minga Guazú',
   'Alto Paraná. Entrega coordinada por WhatsApp.',
   'Alto Paraná. Entrega combinada pelo WhatsApp.',
   4, 250, true, 5),

  -- ── principales del país ──
  ('asuncion', 'Asunción', 'Assunção',
   'Envío por empresa de transporte. Llega en 24 a 48 horas hábiles.',
   'Envio por transportadora. Chega em 24 a 48 horas úteis.',
   7, 400, true, 6),

  ('san-lorenzo', 'San Lorenzo', 'San Lorenzo',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 7),

  ('luque', 'Luque', 'Luque',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 8),

  ('capiata', 'Capiatá', 'Capiatá',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 9),

  ('lambare', 'Lambaré', 'Lambaré',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 10),

  ('fernando-de-la-mora', 'Fernando de la Mora', 'Fernando de la Mora',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 11),

  ('nemby', 'Ñemby', 'Ñemby',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 12),

  ('itaugua', 'Itauguá', 'Itauguá',
   'Central. Envío por empresa de transporte.',
   'Central. Envio por transportadora.',
   7, 400, true, 13),

  ('encarnacion', 'Encarnación', 'Encarnación',
   'Itapúa. Envío por empresa de transporte.',
   'Itapúa. Envio por transportadora.',
   8, 450, true, 14),

  ('pedro-juan-caballero', 'Pedro Juan Caballero', 'Pedro Juan Caballero',
   'Amambay. Envío por empresa de transporte.',
   'Amambay. Envio por transportadora.',
   9, 500, true, 15),

  ('coronel-oviedo', 'Coronel Oviedo', 'Coronel Oviedo',
   'Caaguazú. Envío por empresa de transporte.',
   'Caaguazú. Envio por transportadora.',
   7, 400, true, 16),

  ('caaguazu', 'Caaguazú', 'Caaguazú',
   'Caaguazú. Envío por empresa de transporte.',
   'Caaguazú. Envio por transportadora.',
   7, 400, true, 17),

  ('villarrica', 'Villarrica', 'Villarrica',
   'Guairá. Envío por empresa de transporte.',
   'Guairá. Envio por transportadora.',
   8, 450, true, 18),

  ('concepcion', 'Concepción', 'Concepción',
   'Concepción. Envío por empresa de transporte.',
   'Concepción. Envio por transportadora.',
   9, 500, true, 19),

  ('caacupe', 'Caacupé', 'Caacupé',
   'Cordillera. Envío por empresa de transporte.',
   'Cordillera. Envio por transportadora.',
   7, 400, true, 20),

  ('pilar', 'Pilar', 'Pilar',
   'Ñeembucú. Envío por empresa de transporte.',
   'Ñeembucú. Envio por transportadora.',
   9, 500, true, 21),

  -- ── cajón final: quien no esté en la lista escribe su ciudad ──
  ('otra-ciudad', 'Otra ciudad', 'Outra cidade',
   'Escribí tu ciudad en la dirección. Coordinamos el costo exacto por WhatsApp.',
   'Escreva sua cidade no endereço. Combinamos o custo exato pelo WhatsApp.',
   10, 500, true, 99)

on conflict (slug) do update set
  name_es          = excluded.name_es,
  name_pt          = excluded.name_pt,
  note_es          = excluded.note_es,
  note_pt          = excluded.note_pt,
  requires_address = excluded.requires_address,
  sort_order       = excluded.sort_order,
  active           = true;
  -- El costo y el umbral quedan fuera: si el operador ya los ajustó desde el
  -- panel, un archivo no se los pisa.

select slug, name_es, cost_usd from public.shipping_zones where active order by sort_order;

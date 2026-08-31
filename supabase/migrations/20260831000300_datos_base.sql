-- ═══════════════════════════════════════════════════════════════════════════
-- DATOS DE ARRANQUE
--
-- Solo lo que la tienda necesita para existir: configuración, zonas de envío y
-- categorías. El catálogo de productos NO se siembra acá — se importa desde el
-- panel de administración, que lee el catálogo tipado del proyecto y lo vuelca
-- sin transcribir 1.100 líneas a mano.
--
-- Todo es `on conflict do nothing` o `do update` sobre las columnas que sí son
-- de arranque: correr esta migración diez veces seguidas deja el mismo estado.
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────── configuración

insert into public.settings (key, value) values
  (
    -- Tasa de cambio REFERENCIAL. El dólar es la fuente de verdad de todo
    -- precio; guaraní y real se derivan de acá y se redondean «de vitrina».
    'fx',
    jsonb_build_object(
      'PYG', 7400,
      'BRL', 5.4,
      'reference', '2026-08',
      'auto', false,
      'updated_at', now()
    )
  ),
  (
    'rules',
    jsonb_build_object(
      'lowStockAt', 3,
      'freeShippingUsd', 400,
      'shippingUsd', 12
    )
  ),
  (
    'contact',
    jsonb_build_object(
      'whatsapp', '595994222542',
      'whatsappDisplay', '+595 994 222 542'
    )
  )
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────── zonas de envío

insert into public.shipping_zones
  (slug, name_es, name_pt, note_es, note_pt, cost_usd, free_over_usd, requires_address, sort_order)
values
  (
    'retiro-local',
    'Retiro en el local', 'Retirada na loja',
    'Ciudad del Este. Coordinamos horario por WhatsApp.',
    'Ciudad del Este. Combinamos o horário pelo WhatsApp.',
    0, null, false, 1
  ),
  (
    'gran-asuncion',
    'Gran Asunción', 'Grande Assunção',
    'Asunción y Área Metropolitana. Entrega coordinada por WhatsApp.',
    'Assunção e Região Metropolitana. Entrega combinada pelo WhatsApp.',
    5, 400, true, 2
  ),
  (
    'interior',
    'Interior del país', 'Interior do país',
    'Envío por empresa de transporte. El plazo depende de la ciudad.',
    'Envio por transportadora. O prazo depende da cidade.',
    8, 400, true, 3
  )
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────── categorías

insert into public.categories (slug, name_es, name_pt, role_es, role_pt, shape, sort_order)
values
  ('tarjetas-graficas', 'Tarjetas gráficas', 'Placas de vídeo',
   'Define el techo de rendimiento y el vataje de toda la máquina.',
   'Define o teto de desempenho e a potência de toda a máquina.',
   'gpu', 1),

  ('procesadores', 'Procesadores', 'Processadores',
   'Fija el zócalo: a partir de acá quedan decididas placa y memoria.',
   'Define o soquete: a partir daqui, placa e memória ficam decididas.',
   'cpu', 2),

  ('placas-madre', 'Placas madre', 'Placas-mãe',
   'Decide el formato del gabinete y qué generación de RAM entra.',
   'Decide o formato do gabinete e qual geração de RAM encaixa.',
   'motherboard', 3),

  ('memorias-ram', 'Memorias RAM', 'Memórias RAM',
   'DDR4 y DDR5 no son intercambiables: el módulo no entra en la ranura.',
   'DDR4 e DDR5 não são intercambiáveis: o módulo não entra no slot.',
   'ram', 4),

  ('almacenamiento', 'SSD y almacenamiento', 'SSD e armazenamento',
   'M.2 va sobre la placa; SATA necesita bahía y dos cables.',
   'M.2 vai sobre a placa; SATA precisa de baia e dois cabos.',
   'ssd-m2', 5),

  ('fuentes', 'Fuentes de alimentación', 'Fontes de alimentação',
   'La pieza que nadie mira hasta que apaga el equipo bajo carga.',
   'A peça que ninguém olha até desligar o equipamento sob carga.',
   'psu', 6),

  ('refrigeracion', 'Refrigeración', 'Refrigeração',
   'Altura y radiador tienen que caber: son milímetros, no preferencias.',
   'Altura e radiador precisam caber: são milímetros, não preferências.',
   'air-cooler', 7),

  ('gabinetes', 'Gabinetes', 'Gabinetes',
   'El límite físico de todo lo demás: largo de placa de video y disipador.',
   'O limite físico de todo o resto: comprimento da placa de vídeo e do cooler.',
   'case', 8),

  ('accesorios', 'Accesorios de armado', 'Acessórios de montagem',
   'Lo que falta a mitad del armado y frena todo hasta el lunes.',
   'O que falta no meio da montagem e trava tudo até segunda.',
   'accessory', 9)
on conflict (slug) do nothing;

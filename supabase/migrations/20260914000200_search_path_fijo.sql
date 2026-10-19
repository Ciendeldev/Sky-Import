-- ═══════════════════════════════════════════════════════════════════════════
-- RUTA DE BÚSQUEDA FIJA EN EL DISPARADOR DE FECHAS
--
-- El revisor de seguridad de Supabase marca `touch_updated_at` porque no fija
-- su `search_path`. Una función sin ruta fija resuelve los nombres según la
-- sesión que la ejecuta, y quien pudiera crear un objeto en un esquema anterior
-- de esa ruta podría suplantar lo que la función llama.
--
-- En este disparador el riesgo es bajo —solo llama a `now()`—, pero el
-- arreglo cuesta una línea y deja al revisor sin avisos que no sean decisiones.
-- Con la ruta vacía, `now()` se sigue encontrando: `pg_catalog` se busca
-- siempre, esté o no en la ruta.
--
-- Las demás funciones ya fijaban la suya. Los otros avisos del revisor son
-- decisiones de diseño y están explicadas en `docs/adr/012-catalogo-vigente.md`.
-- ═══════════════════════════════════════════════════════════════════════════

alter function public.touch_updated_at() set search_path = '';

# ADR 009 — RTX 5090 Founders Edition en la portada

Fecha: 2026-09-07. Estado: adoptada por pedido del cliente.

## Decisión
Reemplazar la GPU genérica por una reconstrucción procedural específica de la RTX 5090 FE.
Se consultó el checkout de img2threejs (Apache-2.0), commit
6e60b5e22419464b4853e01ddb6c0e6f6659a733, incluyendo sus guías de análisis,
inventario, geometría y revisión. Se ejecutaron búsqueda local de especificaciones,
creación de assessment/spec, admisión de referencia y comprobación de cobertura de partes.
La fábrica final es escrita a medida: no se importa su runtime genérico ni se
afirma haber certificado toda la cadena automática de generación por pases.

Referencias: página oficial NVIDIA RTX 5090, galería de detalle y despiece térmico,
consultados 2026-09-07. Las fotos de referencia se conservan solo en la carpeta
local .img2threejs, ignorada por Git. La imagen publicada de respaldo es un render
propio del mismo código, no una foto ni un modelo descargado.

## Arquitectura
- src/lib/rtx5090.ts: proporciones externas públicas (304 × 137 × 40 mm),
  nombres bilingües y posiciones/desplazamientos de nueve conjuntos.
- createRtx5090Model.ts: geometría, materiales, identificación y liberación.
- GpuAssembly.tsx: renderer, entorno, cámara ortográfica adaptativa, raycast.
- AssemblyVisual.tsx: scroll nativo, selección accesible y fallback estático.
- Todos los cuadros se actualizan mediante onFrame del motor existente.
- Aletas, contactos, memorias, tornillos y SMD se instancian. Los detalles
  permanecen con su padre durante el despiece. Aspas con barrido y torsión;
  aperturas del frontal, laterales y soporte con geometría pasante.
- Nueve conjuntos, 43.956 triángulos y 92 llamadas de dibujo en el render revisado.
  La selección usa materiales cacheados, sin crear recursos por cuadro.
- No hay cambios de Supabase, panel, precios, inventario ni dependencias npm.
  La pieza es editorial y su CTA consulta disponibilidad/precio por WhatsApp:
  no se reutiliza la ficha comercial de una 5080 para una 5090.

## Fidelidad y límites
Representación ilustrativa, no CAD ni geometría apta para fabricación.
La silueta, ventiladores, estructura de refrigeración y materiales observables
se basan en NVIDIA. La distribución del PCB, trazas, pines, tornillos internos,
conexiones ocultas y curvaturas exactas se aproximan. La interfaz lo declara.
La cobertura de img2threejs verifica modelo contra inventario, no precisión física.
No se atribuye a métricas de píxeles una garantía de realismo o equivalencia técnica.

## Verificación
Capturas de armado, despiece y rearmado en escritorio y Pixel 7, ida y vuelta,
sin errores JavaScript ni desbordamiento horizontal. Fallback generado desde
la propia fábrica. Pruebas de geometría: retorno sin deriva, huecos pasantes,
pertenencia de cada malla a un conjunto y liberación de recursos.
Revisar además la suite de portada (selección, movimiento reducido, pérdida de
contexto, CTA bilingüe), npm run verify y npm run size antes de publicar.

Se revisaron cuatro azimuts más la cara inferior. El gate de turntable se
ejecutó con --allow-holes porque los ventiladores y salidas poseen aperturas
intencionales, comprobadas por raycast; no es un modelo macizo. Cobertura
contra el manifiesto del navegador: 9 conjuntos, cero errores o advertencias.

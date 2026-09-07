/**
 * Genera el documento SRS (IEEE 830 / ISO 29148) de Sky Import.
 *
 * Sigue la plantilla de la cátedra (UNISAL — Taller de Lenguaje 135) e inserta
 * los dos diagramas rasterizados desde SVG.
 *
 *   npm run docs:srs
 *
 * `docx` y `sharp` viven en devDependencies y no llegan al navegador: este
 * script corre una vez, escribe un archivo y no forma parte de la compilación,
 * así que no toca el presupuesto de `size-limit`.
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'srs')

// Ancho útil en A4 con márgenes de una pulgada.
const W = 9026
const AZUL = '1F3864'
const GRIS = 'F2F4F7'

// ─────────────────────────────────────────────────────────────── utilidades

const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120, line: 276 }, ...opts, children: [new TextRun({ text, ...opts.run })] })

const h1 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 } })
const h2 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 } })
const h3 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 120 } })

const bullet = (text) =>
  new Paragraph({ text, numbering: { reference: 'vinetas', level: 0 }, spacing: { after: 80 } })

/** Celda de tabla. */
function cell(text, { w, bold = false, fill, align, size = 20 } = {}) {
  const lineas = Array.isArray(text) ? text : [text]
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: lineas.map(
      (l) =>
        new Paragraph({
          alignment: align,
          spacing: { after: 40, line: 260 },
          children: [new TextRun({ text: String(l), bold, size, color: bold && fill ? '1F3864' : '1A232C' })],
        }),
    ),
  })
}

/** Tabla con encabezado. */
function tabla(encabezados, filas, anchos) {
  return new Table({
    columnWidths: anchos,
    width: { size: W, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: encabezados.map((h, i) => cell(h, { w: anchos[i], bold: true, fill: 'DCE3EF' })),
      }),
      ...filas.map(
        (fila) =>
          new TableRow({ children: fila.map((c, i) => cell(c, { w: anchos[i] })) }),
      ),
    ],
  })
}

/** Ficha de un requisito funcional, con la estructura exacta de la plantilla. */
function requisito(rf) {
  const etiqueta = 2500
  const valor = W - etiqueta
  const fila = (k, v) =>
    new TableRow({ children: [cell(k, { w: etiqueta, bold: true, fill: GRIS }), cell(v, { w: valor })] })

  return [
    new Paragraph({
      text: `${rf.id}: ${rf.nombre}`,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 260, after: 120 },
    }),
    new Table({
      columnWidths: [etiqueta, valor],
      width: { size: W, type: WidthType.DXA },
      rows: [
        fila('Identificador del Requisito', rf.id),
        fila('Nombre del Requisito', rf.nombre),
        fila('Sintaxis Formal (ISO 29148)', rf.sintaxis),
        fila('Descripción del Requisito', rf.descripcion),
        fila('Condiciones de Entrada (Precondiciones)', rf.pre),
        fila('Especificación de Condiciones de Salida (Postcondiciones SQL)', rf.post),
        fila('Requisitos No Funcionales relacionados', rf.rnf),
        fila('Prioridad / Criterio de Aceptación', rf.prioridad),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
  ]
}

function imagen(archivo, ancho, alto, pie) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new ImageRun({
          type: 'png',
          data: readFileSync(`${DIR}\\${archivo}`),
          transformation: { width: ancho, height: alto },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: pie, size: 18, italics: true, color: '5B6875' })],
    }),
  ]
}

// ═══════════════════════════════════════════════ requisitos funcionales

const RF = [
  {
    id: 'RF01',
    nombre: 'Autenticación del administrador',
    sintaxis:
      'Cuando el operador ingrese su nombre de usuario y contraseña [Condición], el módulo de seguridad [Sujeto] deberá verificar [Acción] las credenciales contra el servicio de autenticación de PostgreSQL [Objeto] en un tiempo de respuesta menor a 2 segundos [Restricción].',
    descripcion:
      'El sistema restringe el acceso al panel de administración a los usuarios registrados en la tabla admin_users. La pantalla solicita un nombre de usuario, no un correo: la traducción de «Cielo» a la cuenta interna se realiza en el servidor, de modo que el operador nunca manipula direcciones de correo.',
    pre: [
      '1. El usuario abre la ruta /admin/acceso.',
      '2. La conexión con el servidor PostgreSQL está activa.',
      '3. Existe al menos una cuenta dada de alta con el script de aprovisionamiento.',
    ],
    post: [
      '1. Se consulta el hash de la contraseña mediante el servicio auth de PostgreSQL (SELECT sobre auth.users).',
      '2. Si el hash coincide, se emite un token de sesión y se comprueba la pertenencia con SELECT sobre la tabla admin_users.',
      '3. Si el usuario autentica pero no figura en admin_users, se cierra la sesión inmediatamente y se deniega el acceso.',
      '4. Si falla, se muestra un mensaje genérico que no revela si el error fue el usuario o la contraseña.',
    ],
    rnf: 'RNF01 (Seguridad), RNF02 (Control de acceso), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba: con credenciales válidas se accede al tablero; con una cuenta válida ausente de admin_users el acceso se deniega; verificado mediante prueba automatizada «el panel exige sesión».',
  },
  {
    id: 'RF02',
    nombre: 'Consulta y filtrado del catálogo',
    sintaxis:
      'Cuando el cliente aplique uno o más filtros [Condición], el módulo de catálogo [Sujeto] deberá recalcular y presentar [Acción] el subconjunto de productos coincidentes [Objeto] sin recargar la página y en menos de 300 ms [Restricción].',
    descripcion:
      'El catálogo permite filtrar por categoría, marca, precio máximo y disponibilidad, y ordenar por relevancia, precio o nombre. El estado de los filtros se refleja en la barra de direcciones para que una búsqueda pueda compartirse o recuperarse con los botones de navegación.',
    pre: [
      '1. El catálogo se encuentra cargado con al menos un producto activo.',
      '2. El cliente accede a la ruta /{idioma}/catalogo.',
    ],
    post: [
      '1. SELECT sobre la tabla products con la condición active = true, filtrada por las políticas RLS de lectura pública.',
      '2. Los valores por defecto se eliminan de la dirección en lugar de escribirse, de modo que la URL permanece limpia.',
      '3. No se modifica ningún dato persistido: la operación es de solo lectura.',
    ],
    rnf: 'RNF03 (Rendimiento), RNF05 (Accesibilidad), RNF06 (Internacionalización)',
    prioridad:
      'Alta. Caso de prueba: aplicar el filtro de categoría reduce el recuento mostrado y la dirección resultante, abierta en una pestaña nueva, reproduce el mismo resultado.',
  },
  {
    id: 'RF03',
    nombre: 'Búsqueda insensible a diacríticos',
    sintaxis:
      'Cuando el cliente introduzca un término de búsqueda sin tildes [Condición], el motor de búsqueda [Sujeto] deberá localizar [Acción] los productos cuyo nombre, modelo, marca o código de referencia coincidan [Objeto], ordenados por nivel de coincidencia [Restricción].',
    descripcion:
      'La búsqueda normaliza el texto eliminando marcas diacríticas, de modo que «grafica» encuentra «gráfica» y «refrigeracion» encuentra «refrigeración». Además admite la búsqueda por código de referencia interno, que es el dato que el cliente dicta por teléfono.',
    pre: ['1. El campo de búsqueda del catálogo está visible y habilitado.'],
    post: [
      '1. La coincidencia se resuelve en memoria sobre el conjunto ya recuperado: con este volumen de catálogo, consultar el servidor por cada pulsación sería más lento y menos fiable.',
      '2. Sin escritura en base de datos.',
    ],
    rnf: 'RNF03 (Rendimiento), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba automatizado: la consulta «rtx 5070» sin tildes devuelve la ficha correspondiente. Cubierto por siete pruebas unitarias en tests/unit/search.test.ts.',
  },
  {
    id: 'RF04',
    nombre: 'Selección dinámica de variantes',
    sintaxis:
      'Cuando el cliente seleccione un valor distinto en cualquier eje de variante [Condición], la ficha de producto [Sujeto] deberá actualizar [Acción] la fotografía, el código SKU, el precio y la disponibilidad [Objeto] de forma inmediata y sin recargar la página [Restricción].',
    descripcion:
      'Cada producto puede declarar sus propios ejes de variación —capacidad, color, velocidad, formato—, que se derivan de las variantes existentes en lugar de declararse por separado. Un valor sin unidades se marca como agotado pero permanece seleccionable, para que el cliente sepa que esa versión existe.',
    pre: [
      '1. El producto posee al menos una variante activa en la tabla product_variants.',
      '2. La ficha del producto está cargada.',
    ],
    post: [
      '1. SELECT sobre product_variants filtrado por product_id y active = true, ordenado por sort_order.',
      '2. El precio efectivo se resuelve como COALESCE(variante.price_usd, producto.price_usd).',
      '3. Sin escritura: la selección vive únicamente en el estado del navegador hasta que se agrega al carrito.',
    ],
    rnf: 'RNF04 (Integridad), RNF05 (Accesibilidad), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba: al cambiar de variante, el código SKU mostrado y el precio deben corresponder a la fila seleccionada de product_variants.',
  },
  {
    id: 'RF05',
    nombre: 'Compra directa por WhatsApp',
    sintaxis:
      'Cuando el cliente accione el botón «Comprar por WhatsApp» en la ficha [Condición], el generador de mensajes [Sujeto] deberá componer y abrir [Acción] una conversación de WhatsApp con el detalle del producto codificado [Objeto], sin exigir el paso previo por el carrito [Restricción].',
    descripcion:
      'Constituye la acción principal de la ficha de producto. Genera el mensaje de Formato 1, que incluye nombre, código, cantidad, precio unitario en guaraníes, enlace a la ficha y total. En dispositivos móviles, el botón reaparece en una barra fija al pie cuando la acción original sale de la pantalla.',
    pre: [
      '1. El producto seleccionado posee unidades disponibles.',
      '2. El número de contacto comercial está configurado en el sistema.',
    ],
    post: [
      '1. Operación de solo lectura: no se registra pedido ni se descuenta stock en esta vía.',
      '2. Se abre la dirección wa.me con el mensaje codificado mediante encodeURIComponent.',
    ],
    rnf: 'RNF07 (Usabilidad), RNF08 (Compatibilidad móvil)',
    prioridad:
      'Alta. Caso de prueba automatizado: el enlace generado apunta al número comercial y su parámetro de texto contiene el encabezado de producto, el código y el total en guaraníes.',
  },
  {
    id: 'RF06',
    nombre: 'Gestión del carrito de compras',
    sintaxis:
      'Cuando el cliente agregue, modifique o elimine una línea [Condición], el módulo de carrito [Sujeto] deberá persistir [Acción] el estado resultante en el almacenamiento local del navegador [Objeto], conservándolo entre visitas [Restricción].',
    descripcion:
      'El carrito almacena únicamente el identificador del producto, la variante elegida y la cantidad; el precio y la disponibilidad se releen del catálogo al mostrar, de modo que un carrito antiguo nunca muestra un precio inexistente. Dos variantes de la misma pieza constituyen dos líneas distintas.',
    pre: ['1. El navegador permite el uso de almacenamiento local.'],
    post: [
      '1. Sin escritura en base de datos: el carrito es estado del cliente hasta que se confirma el pedido.',
      '2. Al recuperar el carrito se sanean las líneas: se descartan los productos ausentes del catálogo y se recorta toda cantidad que supere las unidades configuradas.',
    ],
    rnf: 'RNF04 (Integridad), RNF07 (Usabilidad)',
    prioridad:
      'Media-Alta. Caso de prueba automatizado: el carrito sobrevive a una recarga completa de página conservando la cantidad. Cubierto por diez pruebas unitarias.',
  },
  {
    id: 'RF07',
    nombre: 'Verificación de compatibilidad entre componentes',
    sintaxis:
      'Cuando el cliente seleccione dos o más piezas en el configurador [Condición], el motor de compatibilidad [Sujeto] deberá evaluar [Acción] las reglas de zócalo, generación de memoria, formato, dimensiones y potencia [Objeto], informando cada incompatibilidad en lenguaje llano [Restricción].',
    descripcion:
      'El configurador contrasta diez reglas fundamentales entre las ocho ranuras del armado y clasifica los hallazgos en bloqueos y avisos. No pretende ser una validación exhaustiva del mercado: comprueba lo que impide físicamente que un equipo funcione o se ensamble.',
    pre: ['1. El cliente ha seleccionado al menos dos componentes de ranuras distintas.'],
    post: [
      '1. Operación de solo lectura sobre el campo compat de la tabla products.',
      '2. La selección del armado se persiste en el almacenamiento local del navegador, no en la base.',
    ],
    rnf: 'RNF04 (Integridad), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba: un procesador AM5 junto a una placa LGA1700 produce un bloqueo explicado; una fuente inferior a la recomendada produce un aviso. Cubierto por veintitrés pruebas unitarias.',
  },
  {
    id: 'RF08',
    nombre: 'Conversión y presentación multimoneda',
    sintaxis:
      'Cuando el cliente seleccione una moneda de visualización [Condición], el módulo de formato monetario [Sujeto] deberá convertir y presentar [Acción] todos los importes visibles [Objeto] aplicando la tasa vigente y el redondeo comercial correspondiente [Restricción].',
    descripcion:
      'El dólar estadounidense es la fuente de verdad de todo precio; el guaraní y el real se derivan de la tasa configurada. Los importes derivados se redondean al millar en guaraníes y al décimo en reales, y la interfaz los rotula siempre como referenciales.',
    pre: ['1. Existe una tasa de cambio vigente en la tabla settings, clave «fx».'],
    post: [
      '1. SELECT sobre la tabla settings restringido a las claves de lectura pública.',
      '2. Sin escritura. El cambio de moneda no provoca recarga ni petición al servidor.',
    ],
    rnf: 'RNF03 (Rendimiento), RNF04 (Integridad), RNF06 (Internacionalización)',
    prioridad:
      'Alta. Caso de prueba automatizado: al cambiar de moneda, el importe mostrado varía sin recargar la página y coincide con el cálculo de la tasa vigente.',
  },
  {
    id: 'RF09',
    nombre: 'Validación y aplicación de cupón de descuento',
    sintaxis:
      'Cuando el cliente introduzca un código de cupón en el checkout [Condición], la función de validación alojada en la base de datos [Sujeto] deberá comprobar y calcular [Acción] el descuento aplicable [Objeto], sin exponer en ningún caso el listado de cupones existentes [Restricción].',
    descripcion:
      'La validación se ejecuta íntegramente en el servidor de base de datos mediante una función con privilegios definidos, que devuelve el importe del descuento ya calculado o el motivo del rechazo. La tabla de cupones carece de política de lectura pública, por lo que resulta imposible enumerar los códigos vigentes desde el navegador.',
    pre: [
      '1. El carrito contiene al menos una línea.',
      '2. El cliente introduce un código no vacío.',
    ],
    post: [
      '1. Ejecución de la función validate_coupon(código, subtotal) declarada como SECURITY DEFINER.',
      '2. Se verifican en orden: existencia, estado activo, fecha de inicio, fecha de vencimiento, límite de usos y compra mínima.',
      '3. Si procede, devuelve el descuento calculado; si no, devuelve el motivo del rechazo. No se altera ninguna tabla en esta operación.',
    ],
    rnf: 'RNF01 (Seguridad), RNF04 (Integridad)',
    prioridad:
      'Alta. Caso de prueba: un código inexistente devuelve el motivo «no encontrado»; un cupón de porcentaje aplica el descuento correcto sobre el subtotal.',
  },
  {
    id: 'RF10',
    nombre: 'Registro del pedido',
    sintaxis:
      'Cuando el cliente confirme el envío del pedido [Condición], la función transaccional de registro [Sujeto] deberá releer los precios, aplicar el descuento, descontar el stock y persistir el pedido [Acción] en las tablas de pedidos y líneas de pedido [Objeto], en una única transacción atómica [Restricción].',
    descripcion:
      'Constituye la operación crítica del sistema. El cliente transmite qué solicita, nunca cuánto cuesta: los importes se recalculan íntegramente en el servidor de base de datos, lo que impide manipular el total desde el navegador. El pedido nace con el estado «Iniciado por WhatsApp».',
    pre: [
      '1. El carrito contiene al menos una línea.',
      '2. Los campos nombre, apellido y teléfono están completos.',
      '3. Si la zona seleccionada lo requiere, la dirección exacta está informada.',
    ],
    post: [
      '1. SELECT ... FOR UPDATE sobre cada producto y variante implicados, para bloquear la fila durante la transacción.',
      '2. UPDATE sobre products y product_variants descontando las unidades solicitadas.',
      '3. UPDATE sobre coupons incrementando used_count, si se aplicó un cupón.',
      '4. INSERT en la tabla orders con el número correlativo, los importes y la tasa de cambio vigente en ese instante.',
      '5. INSERT en order_items con una fila por línea, copiando nombre, SKU y precio del momento de la compra.',
      '6. Si alguna pieza carece de unidades suficientes, la transacción completa se revierte y no se registra nada.',
    ],
    rnf: 'RNF01 (Seguridad), RNF04 (Integridad), RNF09 (Tolerancia a fallos)',
    prioridad:
      'Alta (crítica). Caso de prueba: un pedido de dos unidades reduce en dos el stock y genera un registro con su número; un pedido que excede las unidades disponibles se rechaza sin efectos colaterales.',
  },
  {
    id: 'RF11',
    nombre: 'Generación del mensaje de pedido completo',
    sintaxis:
      'Cuando el registro del pedido haya concluido [Condición], el generador de mensajes [Sujeto] deberá componer [Acción] el mensaje de pedido con líneas numeradas, cupón, envío, total y datos de entrega [Objeto], codificado para su transmisión por la interfaz de WhatsApp [Restricción].',
    descripcion:
      'Produce el mensaje de Formato 2. Todos los importes se expresan en guaraníes, que es la moneda en que se cierra la operación. Las líneas que no aplican se omiten: sin cupón no se imprime la línea de cupón y sin observaciones no se imprime la línea de notas.',
    pre: ['1. El pedido ha sido procesado, con o sin registro en la base de datos.'],
    post: [
      '1. Operación de solo lectura sobre los datos ya calculados.',
      '2. Se abre la dirección wa.me con el contenido codificado mediante encodeURIComponent.',
      '3. El carrito del cliente se vacía tras la apertura.',
    ],
    rnf: 'RNF06 (Internacionalización), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba: el mensaje generado contiene el encabezado del pedido, una línea numerada por pieza, el bloque de datos de entrega y el total en guaraníes. Cubierto por diecinueve pruebas unitarias que fijan el formato carácter a carácter.',
  },
  {
    id: 'RF12',
    nombre: 'Administración de productos y variantes',
    sintaxis:
      'Cuando el administrador autenticado confirme el formulario de producto [Condición], el módulo de inventario [Sujeto] deberá crear o actualizar [Acción] el registro correspondiente y sus variantes [Objeto], validando previamente unicidad de código y coherencia de precio [Restricción].',
    descripcion:
      'Permite el alta, modificación y baja de productos y de sus variantes. La ficha técnica y los datos de compatibilidad se editan en el catálogo tipado del proyecto y no como texto libre, dado que alimentan el motor de compatibilidad y una edición no validada produciría armados imposibles sin aviso.',
    pre: [
      '1. Existe una sesión de administrador activa.',
      '2. Los campos identificador, código y nombre están informados.',
      '3. El precio es un número mayor o igual a cero.',
    ],
    post: [
      '1. INSERT o UPDATE sobre la tabla products, autorizado por la política RLS que exige pertenencia a admin_users.',
      '2. INSERT, UPDATE o DELETE sobre product_variants según la operación solicitada.',
      '3. Si el código de referencia o el identificador ya existen, la restricción de unicidad rechaza la operación y se informa el motivo.',
      '4. Se invalida la caché de las rutas públicas afectadas para que el cambio se refleje en la tienda.',
    ],
    rnf: 'RNF01 (Seguridad), RNF02 (Control de acceso), RNF04 (Integridad)',
    prioridad:
      'Alta. Caso de prueba: crear un producto con un código ya existente devuelve un mensaje explícito y no altera la base.',
  },
  {
    id: 'RF13',
    nombre: 'Control de stock con alertas de mínimo',
    sintaxis:
      'Cuando las unidades de un producto activo desciendan hasta el umbral configurado o por debajo [Condición], el módulo de inventario [Sujeto] deberá señalar [Acción] dicho producto en el panel de alertas [Objeto], diferenciando el estado agotado del estado de últimas unidades [Restricción].',
    descripcion:
      'La disponibilidad se deriva siempre del número de unidades: no existe ningún campo «agotado» que pueda contradecirlo. Cada producto admite un umbral propio; en su ausencia se aplica el umbral general configurado. Con variantes activas, el stock del producto pasa a ser la suma de las unidades de sus variantes.',
    pre: ['1. Existe una sesión de administrador activa.'],
    post: [
      '1. UPDATE sobre products.units al ajustar el stock desde el listado.',
      '2. SELECT sobre products con active = true para componer el listado de alertas, ordenado con los agotados en primer lugar.',
      '3. La clasificación se calcula, no se almacena: no hay estado persistido que pueda desincronizarse del stock real.',
    ],
    rnf: 'RNF04 (Integridad), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba: fijar las unidades de una pieza en cero la clasifica como agotada en el tablero; fijarlas en un valor igual al umbral la clasifica como últimas unidades.',
  },
  {
    id: 'RF14',
    nombre: 'Configuración de precios y tasa de cambio',
    sintaxis:
      'Cuando el administrador registre una nueva tasa de cambio [Condición], el módulo de configuración [Sujeto] deberá persistir y propagar [Acción] dicho valor a la totalidad de la tienda y de los mensajes generados [Objeto], sin necesidad de un nuevo despliegue [Restricción].',
    descripcion:
      'Centraliza la tasa de guaraníes y reales por dólar, el mes de referencia y el umbral de aviso de últimas unidades. El costo del envío no figura en el sistema: se acuerda por la vía de mensajería. No existe ninguna segunda copia de estos valores en el código de la aplicación.',
    pre: [
      '1. Existe una sesión de administrador activa.',
      '2. Ambas tasas son números mayores que cero.',
    ],
    post: [
      '1. INSERT ... ON CONFLICT DO UPDATE sobre la tabla settings para las claves «fx» y «rules».',
      '2. Se registra la marca temporal de actualización.',
      '3. Se invalida la caché de las rutas públicas para propagar el cambio.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF04 (Integridad)',
    prioridad:
      'Media-Alta. Caso de prueba: modificar la tasa altera el importe en guaraníes mostrado en el catálogo y el que se imprime en el mensaje de WhatsApp.',
  },
  {
    id: 'RF15',
    nombre: 'Administración de cupones de descuento',
    sintaxis:
      'Cuando el administrador registre un cupón [Condición], el módulo de promociones [Sujeto] deberá almacenar [Acción] su código, tipo, valor, compra mínima, vigencia y límite de usos [Objeto], garantizando la unicidad del código con independencia de mayúsculas [Restricción].',
    descripcion:
      'Permite generar cupones por porcentaje o por monto fijo en dólares, con restricción de compra mínima, ventana de vigencia y límite de canjes. El estado del cupón se deriva de sus datos y del reloj, de modo que no puede existir un cupón marcado como activo pero vencido.',
    pre: [
      '1. Existe una sesión de administrador activa.',
      '2. El valor es mayor que cero y, en cupones porcentuales, no supera cien.',
    ],
    post: [
      '1. INSERT o UPDATE sobre la tabla coupons, autorizado por política RLS.',
      '2. Un índice único sobre el código en mayúsculas impide duplicados que difieran solo en capitalización.',
      '3. Restricciones de tabla verifican que el porcentaje no exceda cien y que la fecha de vencimiento sea posterior a la de inicio.',
    ],
    rnf: 'RNF01 (Seguridad), RNF04 (Integridad)',
    prioridad:
      'Media. Caso de prueba: registrar un cupón con un código ya existente devuelve un mensaje explícito; un cupón vencido se muestra con estado «vencido» sin intervención manual.',
  },
  {
    id: 'RF16',
    nombre: 'Seguimiento interno de pedidos',
    sintaxis:
      'Cuando el administrador consulte el historial [Condición], el módulo de pedidos [Sujeto] deberá presentar [Acción] la totalidad de los pedidos con su estado, importes, líneas y datos de entrega [Objeto], ordenados del más reciente al más antiguo [Restricción].',
    descripcion:
      'Registra cada pedido generado hacia WhatsApp con el estado inicial «Iniciado por WhatsApp», y permite avanzarlo a confirmado, en preparación, entregado o cancelado, así como anotar observaciones internas no visibles para el cliente. Los importes mostrados son los grabados en el momento de la compra.',
    pre: ['1. Existe una sesión de administrador activa.'],
    post: [
      '1. SELECT sobre orders con unión a order_items, restringido por la política RLS que exige pertenencia a admin_users.',
      '2. UPDATE sobre orders.status y orders.admin_note al modificar el seguimiento.',
      '3. Los importes no se recalculan: se preservan los valores y la tasa de cambio grabados con el pedido.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF04 (Integridad), RNF10 (Trazabilidad)',
    prioridad:
      'Alta. Caso de prueba: un pedido recién generado figura con estado «Iniciado por WhatsApp» y su total coincide con el comunicado al cliente.',
  },
]

// ═══════════════════════════════════════════════════════ documento

const doc = new Document({
  creator: 'Sky Import',
  title: 'Especificación de Requisitos de Software — Sky Import',
  description: 'SRS conforme a IEEE 830-1998 e ISO/IEC/IEEE 29148:2011',
  numbering: {
    config: [
      {
        reference: 'vinetas',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 460, hanging: 240 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22, color: '1A232C' } },
      heading1: {
        run: { font: 'Calibri', size: 32, bold: true, color: AZUL },
        paragraph: { spacing: { before: 360, after: 180 } },
      },
      heading2: {
        run: { font: 'Calibri', size: 26, bold: true, color: AZUL },
        paragraph: { spacing: { before: 280, after: 140 } },
      },
      heading3: {
        run: { font: 'Calibri', size: 23, bold: true, color: '2E5B8C' },
        paragraph: { spacing: { before: 220, after: 120 } },
      },
    },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9D2DA' } },
              children: [
                new TextRun({ text: 'Sky Import — Especificación de Requisitos de Software', size: 16, color: '5B6875' }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Página ', size: 16, color: '5B6875' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '5B6875' }),
                new TextRun({ text: ' de ', size: 16, color: '5B6875' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '5B6875' }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ─────────────────────────────────────────────────── PORTADA
        new Paragraph({ text: '', spacing: { after: 900 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'UNIVERSIDAD SAN LORENZO (UNISAL)', bold: true, size: 26, color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 700 },
          children: [new TextRun({ text: 'FACULTAD DE INGENIERÍA EN INFORMÁTICA', bold: true, size: 22, color: '2E5B8C' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: 'Especificación de Requisitos de Software', size: 44, bold: true, color: '12181F' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 460 },
          children: [new TextRun({ text: '(SRS)', size: 32, color: '5B6875' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 700 },
          border: { top: { style: BorderStyle.SINGLE, size: 12, color: AZUL }, bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL } },
          children: [new TextRun({ text: '  SKY IMPORT  ', size: 40, bold: true, color: AZUL })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 500 },
          children: [
            new TextRun({ text: 'Plataforma de comercio electrónico de componentes informáticos', size: 22, color: '40546B' }),
            new TextRun({ text: ' con cierre de venta asistido y panel de administración', size: 22, color: '40546B' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
          children: [new TextRun({ text: 'Basado en los estándares IEEE 830-1998 e ISO/IEC/IEEE 29148:2011', size: 20, italics: true, color: '5B6875' })],
        }),
        new Paragraph({ text: '', spacing: { after: 600 } }),
        tabla(
          ['Campo', 'Detalle'],
          [
            ['Proyecto', 'Sky Import — Componentes para PC, Ciudad del Este'],
            ['Autor / Estudiante', 'Cielo Medina'],
            ['Cátedra / Semestre', 'Taller de Lenguaje (Asignatura 135) | Décimo Semestre'],
            ['Fecha de Entrega', '6 de septiembre de 2026'],
            ['Docente Evaluador', 'Adrian Lopez'],
            ['Versión del Documento', '1.0 — Versión Final Hito 1'],
          ],
          [2800, 6226],
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─────────────────────────────────── FICHA DE CONTROL
        h1('Ficha de Control del Documento'),
        p('Esta sección registra las versiones, revisiones y responsables de calidad del documento, asegurando la trazabilidad del proceso de ingeniería de requisitos.'),
        tabla(
          ['Fecha', 'Versión', 'Autor(es)', 'Detalles de la Revisión / Cambios'],
          [
            ['24/08/2026', '0.1', 'Analista de Requisitos', 'Borrador inicial de Introducción y Descripción General.'],
            ['28/08/2026', '0.5', 'Analista de Requisitos', 'Inclusión de Requisitos Funcionales y No Funcionales.'],
            ['30/08/2026', '0.8', 'Analista de Requisitos', 'Incorporación de diagrama de bloques y diagrama de flujo del proceso de venta.'],
            ['06/09/2026', '1.0', 'Equipo de SQA', 'Validación completa de consistencia, completitud y trazabilidad. Versión Final Hito 1.'],
          ],
          [1300, 1100, 2200, 4426],
        ),
        new Paragraph({ text: '', spacing: { after: 260 } }),
        h2('Firmas y Aprobaciones del Proyecto'),
        tabla(
          ['Rol / Entidad', 'Firma / Aprobación', 'Fecha'],
          [
            ['Por el Proveedor (Estudiante / Desarrollador)', '', '06/09/2026'],
            ['Por el Cliente (Sky Import)', '', '06/09/2026'],
            ['Equipo de SQA (Docente de Cátedra)', '', '06/09/2026'],
          ],
          [3600, 3626, 1800],
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─────────────────────────────────── TABLA DE CONTENIDO
        h1('Tabla de Contenido'),
        p('Nota: al abrir este documento en Microsoft Word o Google Docs, haga clic derecho sobre el índice y seleccione «Actualizar campos» para poblar el contenido.', { run: { italics: true, size: 20, color: '5B6875' } }),
        new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-3' }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════ 1 INTRODUCCIÓN
        h1('1. Introducción'),
        h2('1.1 Propósito'),
        p('El presente documento constituye la Especificación de Requisitos de Software (SRS) del sistema Sky Import. Su objetivo es definir de forma detallada y verificable las funcionalidades, las restricciones, las interfaces de hardware y software y los atributos de calidad que el producto debe poseer.'),
        p('El documento está dirigido a los siguientes perfiles:'),
        bullet('Desarrolladores: como especificación técnica de lo que debe construirse y de las condiciones de entrada y salida de cada operación.'),
        bullet('Administradores de base de datos: como definición del modelo de persistencia, las restricciones de integridad y las políticas de seguridad a nivel de fila.'),
        bullet('Analistas de aseguramiento de la calidad (SQA): como base para derivar los casos de prueba y verificar las condiciones de salida.'),
        bullet('Cliente y docente evaluador: como acuerdo formal sobre el alcance comprometido.'),
        p('Este documento servirá como contrato técnico y guía para las fases de modelado UML, desarrollo de la base de datos SQL y codificación.'),

        h2('1.2 Ámbito del Sistema'),
        p('El software se identifica oficialmente con el nombre de Sky Import.'),
        p('Objetivos de Negocio', { run: { bold: true } }),
        p('Sky Import es un comercio importador de componentes informáticos situado en Ciudad del Este, Paraguay, en zona de frontera con Brasil y Argentina. Su operación actual presenta las siguientes ineficiencias:'),
        bullet('El catálogo y los precios se comunican de forma manual por mensajería, lo que obliga a repetir la misma información a cada consulta.'),
        bullet('La conversión entre dólares, guaraníes y reales se realiza a mano, con riesgo de error de cálculo y de inconsistencia entre lo cotizado y lo cobrado.'),
        bullet('El control de existencias no está sistematizado, lo que produce ventas de piezas sin stock.'),
        bullet('No existe registro de los pedidos iniciados, por lo que resulta imposible el seguimiento comercial de una consulta no concretada.'),
        p('La automatización de estos procesos persigue los siguientes beneficios estratégicos:'),
        bullet('Reducción del tiempo de atención por consulta, al publicar ficha técnica, disponibilidad y precio en las tres monedas antes del primer contacto.'),
        bullet('Eliminación del error humano de cálculo, mediante conversión automática desde una tasa única configurable.'),
        bullet('Consistencia garantizada entre lo publicado y lo vendido, al recalcular los importes del pedido en el servidor de base de datos.'),
        bullet('Trazabilidad completa de los pedidos iniciados, aun cuando el cliente no concrete la conversación.'),
        p('Límites del Sistema', { run: { bold: true } }),
        tabla(
          ['El sistema SÍ hará (In-Scope)', 'El sistema NO hará (Out-Scope)'],
          [
            ['1. Publicación del catálogo con ficha técnica, fotografía, variantes, disponibilidad y precio en tres monedas.', '1. Procesamiento de pagos electrónicos. No existe pasarela ni campo alguno donde introducir datos de tarjeta.'],
            ['2. Verificación automática de compatibilidad entre componentes antes de la compra.', '2. Gestión de la logística de transporte y del seguimiento físico de los envíos.'],
            ['3. Gestión de existencias con alertas de stock mínimo y agotado.', '3. Liquidación de haberes del personal y contabilidad de la empresa.'],
            ['4. Registro de pedidos con seguimiento interno de estado y trazabilidad de importes.', '4. Emisión de documentos tributarios legales (facturación electrónica).'],
            ['5. Administración de cupones de descuento, tasa de cambio y umbrales comerciales.', '5. Gestión de relaciones con proveedores y órdenes de importación.'],
            ['6. Generación del pedido estructurado para su cierre por mensajería instantánea.', '6. Atención automatizada de la conversación posterior. El cierre lo realiza una persona.'],
          ],
          [4513, 4513],
        ),

        h2('1.3 Personal Involucrado'),
        tabla(
          ['Nombre', 'Rol en el Proyecto', 'Responsabilidad Principal', 'Contacto'],
          [
            ['Cielo Medina', 'Analista, Diseñador y Programador', 'Análisis de requisitos, modelado UML, diseño e implementación de la base de datos y codificación del sistema.', 'ciendel.dev@gmail.com'],
            ['Adrian Lopez', 'Docente de Cátedra / Cliente', 'Supervisión del proceso de software, validación de las condiciones de salida y evaluación final del prototipo.', 'Cátedra Taller de Lenguaje 135'],
            ['Titular de Sky Import', 'Cliente / Usuario Administrador', 'Definición de las reglas de negocio, provisión de datos de catálogo y validación funcional del panel.', '+595 994 222 542'],
          ],
          [1900, 1900, 3826, 1400],
        ),

        h2('1.4 Definiciones, Acrónimos y Abreviaturas'),
        tabla(
          ['Término', 'Definición'],
          [
            ['SRS / ERS', 'Software Requirements Specification. Especificación de Requisitos de Software.'],
            ['RF', 'Requisito Funcional. Comportamiento o servicio que provee el sistema.'],
            ['RNF', 'Requisito No Funcional. Atributo de calidad o restricción operacional.'],
            ['SQL', 'Structured Query Language. Lenguaje de consulta para bases de datos relacionales.'],
            ['PostgreSQL', 'Motor de base de datos relacional de software libre utilizado por el sistema.'],
            ['SQA', 'Software Quality Assurance. Aseguramiento de la Calidad del Software.'],
            ['RLS', 'Row Level Security. Seguridad a nivel de fila: mecanismo de PostgreSQL que restringe qué filas puede leer o escribir cada usuario, aplicado por el propio motor y no por la aplicación.'],
            ['SKU', 'Stock Keeping Unit. Código único que identifica una variante concreta de un producto.'],
            ['SSG / ISR', 'Static Site Generation / Incremental Static Regeneration. Generación estática de páginas y su regeneración periódica sin necesidad de un nuevo despliegue.'],
            ['Variante', 'Versión de un producto que difiere en uno o más ejes (capacidad, color, velocidad) y posee SKU, stock y precio propios.'],
            ['Cupón', 'Código que otorga un descuento porcentual o de monto fijo, sujeto a compra mínima, vigencia y límite de usos.'],
            ['Zona de envío', 'Destino de entrega. Es un dato geográfico, no tarifario: el sistema no le asocia ningún costo, porque el flete depende del peso, del volumen y de la distancia, y se acuerda por la vía de mensajería.'],
            ['WCAG 2.1 AA', 'Web Content Accessibility Guidelines, nivel AA. Norma internacional de accesibilidad web.'],
            ['SECURITY DEFINER', 'Cláusula de PostgreSQL que ejecuta una función con los privilegios de su propietario, permitiendo operaciones controladas sin conceder acceso directo a las tablas.'],
          ],
          [2100, 6926],
        ),

        h2('1.5 Referencias'),
        bullet('IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.'),
        bullet('ISO/IEC/IEEE 29148:2011, Systems and software engineering — Life cycle processes — Requirements engineering.'),
        bullet('SWEBOK v4 (Software Engineering Body of Knowledge), Capítulo 1: Requisitos de Software.'),
        bullet('W3C, Web Content Accessibility Guidelines (WCAG) 2.1, nivel AA.'),
        bullet('Documentación técnica del proyecto: README.md, DESIGN.md, PRODUCT.md y registros de decisión en docs/adr/.'),
        bullet('Planeamiento Académico 2026 — Asignatura Taller de Lenguaje (Décimo Semestre, UNISAL).'),

        h2('1.6 Resumen del Documento'),
        p('Este documento consta de cuatro secciones. La primera presenta los datos introductorios, el alcance y el personal involucrado. La segunda describe el contexto general del producto, los perfiles de usuario y las restricciones de diseño, e incorpora el diagrama de bloques y el diagrama de flujo del proceso principal. La tercera define de forma exhaustiva las interfaces externas, los dieciséis requisitos funcionales con sus precondiciones y postcondiciones SQL, y los requisitos no funcionales con sus métricas de verificación. La cuarta reúne la información complementaria de soporte.'),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════ 2 DESCRIPCIÓN GENERAL
        h1('2. Descripción General'),
        h2('2.1 Perspectiva del Producto'),
        p('Sky Import es un producto de software independiente: no forma parte de un ecosistema corporativo preexistente ni sustituye a un sistema anterior. Administra su propia base de datos relacional y expone una interfaz web pública y un panel de administración restringido.'),
        p('El sistema mantiene tres interfaces lógicas con entidades externas:'),
        bullet('Servidor de base de datos PostgreSQL, alojado en la plataforma Supabase, que provee persistencia, autenticación y seguridad a nivel de fila.'),
        bullet('Interfaz de mensajería WhatsApp, mediante enlace codificado, que constituye el único canal de cierre de venta.'),
        bullet('Plataforma de alojamiento y red de distribución de contenido, que sirve la aplicación sobre HTTPS.'),
        p('El siguiente diagrama de bloques representa las fronteras del sistema y su interacción con dichas entidades:'),
        ...imagen('bloques.png', 620, 413, 'Figura 1 — Diagrama de bloques del sistema Sky Import.'),
        new Paragraph({ children: [new PageBreak()] }),

        h2('2.2 Funcionalidad del Producto'),
        p('El sistema se organiza lógicamente en las siguientes macro-funcionalidades:'),
        bullet('Módulo de Gestión de Acceso y Seguridad: autenticación del perfil administrador y control de permisos verificado por el motor de base de datos.'),
        bullet('Módulo de Catálogo: publicación de productos con ficha técnica, fotografía, variantes, filtros, búsqueda y presentación multimoneda.'),
        bullet('Módulo de Configuración de Equipos: verificación automática de compatibilidad entre los componentes seleccionados.'),
        bullet('Módulo de Carrito y Checkout: acumulación de líneas, recolección de datos de entrega, aplicación de cupones y cálculo de totales.'),
        bullet('Módulo de Registro de Transacciones: persistencia del pedido, descuento de existencias y generación del mensaje estructurado.'),
        bullet('Módulo de Administración de Inventario: alta, modificación y baja de productos y variantes, con control de existencias y alertas.'),
        bullet('Módulo de Configuración Comercial: tasa de cambio, umbral de aviso de existencias y cupones de descuento.'),
        bullet('Módulo de Seguimiento de Pedidos: historial con estados, importes históricos y observaciones internas.'),
        p('El siguiente cursograma detalla el proceso principal del sistema, desde la consulta de un producto hasta el registro del pedido y su cierre por mensajería:'),
        ...imagen('flujo.png', 470, 647, 'Figura 2 — Diagrama de flujo del proceso de compra y cierre de venta.'),
        new Paragraph({ children: [new PageBreak()] }),

        h2('2.3 Características de los Usuarios'),
        tabla(
          ['Tipo de Usuario / Rol', 'Formación / Nivel Técnico', 'Módulos / Permisos Autorizados', 'Actividades Principales'],
          [
            [
              'Administrador (titular del comercio)',
              'Usuario avanzado, con experiencia media en sistemas de gestión. No requiere conocimientos de programación.',
              'Acceso total: inventario, variantes, precios, tasa de cambio, cupones y pedidos. Verificado por pertenencia a la tabla admin_users.',
              'Carga y actualización del catálogo, ajuste de existencias, definición de precios y tasa, generación de cupones y seguimiento de pedidos.',
            ],
            [
              'Cliente / Visitante',
              'Usuario final externo, de formación diversa. Se asume competencia básica en navegación web y uso de mensajería.',
              'Acceso público de solo lectura al catálogo, al configurador y al proceso de compra. Sin acceso a datos de otros clientes ni al panel.',
              'Consulta del catálogo, comparación de compatibilidad, armado del carrito y envío del pedido por mensajería.',
            ],
          ],
          [1900, 2300, 2500, 2326],
        ),
        p('El sistema no contempla en esta fase un perfil de operador intermedio ni un área de cliente con cuenta propia. La justificación se detalla en la sección 2.6.'),

        h2('2.4 Restricciones'),
        p('Restricciones tecnológicas y de arquitectura:'),
        bullet('El sistema se diseña según un modelo cliente/servidor, con renderizado en servidor y cliente ligero en el navegador.'),
        bullet('El motor de base de datos es PostgreSQL, en cumplimiento de la restricción impuesta por la cátedra.'),
        bullet('El control de acceso se implementa mediante roles y políticas de seguridad a nivel de fila (RLS) aplicadas por el propio motor, y no únicamente por la capa de aplicación.'),
        bullet('La interfaz de usuario consiste en un conjunto de pantallas visualizadas desde un navegador web, adaptadas a dispositivos móviles y de escritorio.'),
        bullet('Todo texto visible por el cliente debe existir en español y portugués; la ausencia de una traducción impide la compilación del proyecto.'),
        bullet('La credencial de acceso administrativo no puede figurar en el repositorio de código bajo ninguna forma, ni en claro ni cifrada.'),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          shading: { type: ShadingType.CLEAR, fill: 'FDF3E3' },
          border: {
            top: { style: BorderStyle.SINGLE, size: 6, color: 'B5762F' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B5762F' },
            left: { style: BorderStyle.SINGLE, size: 18, color: 'B5762F' },
            right: { style: BorderStyle.SINGLE, size: 6, color: 'B5762F' },
          },
          children: [
            new TextRun({ text: 'Observación sobre el lenguaje de implementación. ', bold: true, color: '7A4D12' }),
            new TextRun({
              text: 'La cátedra autoriza Java, C++, PHP o Python. El presente sistema está implementado en TypeScript sobre el entorno Node.js, con renderizado en servidor. Se solicita la validación expresa del docente respecto de esta desviación, dado que el resto de las restricciones —arquitectura cliente/servidor, motor PostgreSQL, control de acceso por roles e interfaz web— se cumplen íntegramente.',
              color: '5E4520',
            }),
          ],
        }),

        h2('2.5 Suposiciones y Dependencias'),
        p('El cumplimiento de los requisitos aquí descritos asume las siguientes condiciones:'),
        bullet('Conectividad de red: los equipos cliente disponen de conexión estable a internet para alcanzar el servidor de aplicación y el servidor de base de datos.'),
        bullet('Disponibilidad del servicio de mensajería: se asume que WhatsApp se encuentra operativo y que el cliente dispone de la aplicación instalada o accede a su versión web. Una indisponibilidad prolongada de este servicio dejaría al sistema sin canal de cierre de venta.'),
        bullet('Vigencia de la tasa de cambio: se asume que el administrador actualiza la tasa con la periodicidad que la volatilidad cambiaria requiera. El sistema no consulta ninguna fuente de cotización en vivo y rotula todos los importes derivados como referenciales.'),
        bullet('Integridad del entorno: el navegador del cliente admite almacenamiento local; su bloqueo impediría la persistencia del carrito entre visitas.'),
        bullet('Provisión de contenido: se asume que el titular del comercio provee las especificaciones técnicas verificadas de cada pieza. El sistema no valida los datos contra fuentes del fabricante.'),

        h2('2.6 Requisitos Futuros'),
        p('Las siguientes funcionalidades han sido identificadas pero quedan explícitamente fuera del alcance de esta fase:'),
        bullet('Cuenta de cliente con historial de pedidos propio y seguimiento del estado en línea.'),
        bullet('Perfil de operador intermedio, con permisos de carga de transacciones pero sin acceso a la configuración comercial ni a la eliminación de registros.'),
        bullet('Integración con pasarela de pago en línea, que permitiría cerrar la transacción económica dentro del sistema.'),
        bullet('Emisión de documentos tributarios electrónicos conforme a la normativa paraguaya.'),
        bullet('Actualización automática de la tasa de cambio desde una fuente de cotización externa.'),
        bullet('Notificación automatizada al cliente ante cambios de estado del pedido.'),
        bullet('Informes estadísticos de ventas por período, categoría y margen.'),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════ 3 REQUISITOS ESPECÍFICOS
        h1('3. Requisitos Específicos'),
        h2('3.1 Interfaces Externas'),
        h3('3.1.1 Interfaces de Usuario'),
        p('La interfaz consiste en pantallas web adaptadas a una interacción intuitiva, con las siguientes características:'),
        bullet('Formato común: encabezado persistente con navegación, selector de moneda, selector de idioma y acceso al carrito. El panel de administración presenta una barra lateral con las secciones autorizadas.'),
        bullet('Campos obligatorios señalados y validados antes del envío, con mensajes de error explícitos que no descartan lo ya introducido.'),
        bullet('Todo control interactivo posee un objetivo táctil mínimo de 44 por 44 píxeles.'),
        bullet('Las cifras comparables se presentan en tipografía monoespaciada con numeración tabular, de modo que los importes se alineen verticalmente.'),
        bullet('El sistema respeta la preferencia de movimiento reducido del sistema operativo, desactivando toda animación cuando está activa.'),
        bullet('La totalidad de la interfaz se ofrece en español y portugués, conmutables sin recarga de página.'),

        h3('3.1.2 Interfaces de Hardware'),
        p('Requisitos mínimos del equipo cliente:'),
        tabla(
          ['Componente', 'Mínimo', 'Recomendado'],
          [
            ['Procesador', '1.66 GHz, arquitectura x64', '2.0 GHz o superior'],
            ['Memoria RAM', '2 GB', '4 GB o superior'],
            ['Resolución de pantalla', '360 × 640 px (móvil)', '1366 × 768 px o superior'],
            ['Conexión de red', '1 Mbps', '5 Mbps o superior'],
            ['Periféricos', 'Pantalla táctil o teclado y ratón', 'Teclado, ratón y pantalla de 15 pulgadas'],
          ],
          [2600, 3213, 3213],
        ),
        p('El sistema no requiere periféricos especializados: no utiliza lector de código de barras, impresora térmica ni terminal de pago.'),

        h3('3.1.3 Interfaces de Software'),
        tabla(
          ['Elemento', 'Especificación'],
          [
            ['Sistema operativo del cliente', 'Windows 10 o superior, macOS 12 o superior, distribución Linux con soporte vigente, Android 10 o superior, iOS 15 o superior.'],
            ['Navegador web', 'Google Chrome 100+, Mozilla Firefox 100+, Microsoft Edge 100+ o Safari 15+, con JavaScript habilitado.'],
            ['Entorno de ejecución del servidor', 'Node.js versión 24.19.0, fijada en el repositorio para garantizar reproducibilidad.'],
            ['Motor de base de datos', 'PostgreSQL 15 o superior, con la extensión pgcrypto habilitada.'],
            ['Servicio de autenticación', 'Servicio de identidad de la plataforma, con almacenamiento irreversible de credenciales.'],
            ['Interfaz de mensajería', 'API de enlace de WhatsApp mediante el esquema wa.me con parámetros codificados.'],
          ],
          [2600, 6426],
        ),

        h3('3.1.4 Interfaces de Comunicación'),
        bullet('Protocolo TCP/IP como capa base de red para la comunicación cliente-servidor.'),
        bullet('HTTPS sobre el puerto 443 para la totalidad del tráfico web. No se admite tráfico sin cifrar.'),
        bullet('Conexión al motor PostgreSQL sobre el puerto estándar 5432, cifrada mediante TLS.'),
        bullet('Interfaz REST sobre HTTPS para las operaciones de consulta y para la invocación de funciones de base de datos.'),
        bullet('Cabeceras de seguridad aplicadas a todas las respuestas: X-Content-Type-Options, Referrer-Policy y X-Frame-Options. Las rutas del panel incorporan además directivas de no indexación y de no almacenamiento en caché.'),
        new Paragraph({ children: [new PageBreak()] }),

        // ────────────────────────── 3.2 REQUISITOS FUNCIONALES
        h2('3.2 Requisitos Funcionales'),
        p('Se especifican a continuación los dieciséis requisitos funcionales del sistema, redactados conforme a la sintaxis normalizada de ISO/IEC/IEEE 29148 y detallando para cada uno sus condiciones de entrada y sus condiciones de salida sobre la base de datos.'),
        ...RF.flatMap(requisito),
        new Paragraph({ children: [new PageBreak()] }),

        // ────────────────────────── 3.3 RENDIMIENTO
        h2('3.3 Requisitos de Rendimiento'),
        p('Los siguientes requisitos son cuantitativos y verificables en la fase de control de calidad:'),
        tabla(
          ['Identificador', 'Requisito de Rendimiento', 'Métrica Objetivo'],
          [
            ['RP01', 'Tiempo de respuesta de una consulta de catálogo bajo carga habitual.', 'Inferior a 1.5 segundos.'],
            ['RP02', 'Tiempo de respuesta del filtrado y la búsqueda en el catálogo.', 'Inferior a 300 milisegundos, sin viaje al servidor.'],
            ['RP03', 'Tiempo de verificación de credenciales de acceso.', 'Inferior a 2 segundos.'],
            ['RP04', 'Tiempo de registro de un pedido completo, incluyendo descuento de existencias.', 'Inferior a 3 segundos.'],
            ['RP05', 'Conexiones concurrentes soportadas sin degradación apreciable.', 'Hasta 60 conexiones simultáneas al motor de base de datos.'],
            ['RP06', 'Volumen de código de cliente transferido al navegador.', 'No superior a 650 kB comprimidos. Medición vigente: 601 kB.'],
            ['RP07', 'Latencia de propagación de un cambio del panel a la tienda pública.', 'Hasta 60 segundos, por regeneración estática incremental.'],
          ],
          [1500, 4526, 3000],
        ),

        h2('3.4 Restricciones de Diseño'),
        bullet('El modelo relacional cumple las formas normales primera, segunda y tercera. Los datos de ficha técnica y compatibilidad se almacenan en columnas de tipo JSON estructurado por tratarse de atributos heterogéneos entre categorías, decisión documentada en el registro de decisiones del proyecto.'),
        bullet('Se emplean sentencias SQL estándar y funciones declaradas en el propio motor, de modo que la lógica crítica de negocio resida junto a los datos que valida.'),
        bullet('El dólar estadounidense constituye la única fuente de verdad de los precios; las monedas derivadas se calculan y nunca se almacenan como dato independiente.'),
        bullet('La disponibilidad de un producto se deriva siempre de sus unidades. No existe ningún campo de estado que pueda contradecir el stock real.'),
        bullet('Los importes y la tasa de cambio se copian al pedido en el momento de su registro, de modo que un pedido histórico preserve las condiciones bajo las que se pactó.'),
        bullet('La clave de servicio de la base de datos, que elude las políticas de seguridad, no se emplea en ninguna operación atendida por el público y se restringe al aprovisionamiento inicial de la cuenta administrativa.'),

        h2('3.5 Atributos del Sistema (Requisitos No Funcionales)'),
        tabla(
          ['ID', 'Atributo de Calidad', 'Requisito Detallado', 'Métrica de Verificación', 'Prioridad'],
          [
            ['RNF01', 'Seguridad informática', 'Las credenciales se almacenan de forma irreversible y las políticas de acceso se aplican en el motor de base de datos, no solo en la aplicación.', 'Seguridad a nivel de fila activa en las 8 tablas. Verificación: una consulta anónima a las tablas de cupones, pedidos y usuarios administrativos devuelve un conjunto vacío.', 'Alta (Mandatorio)'],
            ['RNF02', 'Control de acceso', 'El acceso al panel exige sesión válida y pertenencia explícita al registro de administradores.', 'Prueba automatizada: toda ruta del panel sin sesión redirige a la pantalla de acceso.', 'Alta'],
            ['RNF03', 'Rendimiento', 'Las páginas públicas se generan de forma estática y se regeneran periódicamente.', '99 páginas generadas estáticamente en la compilación. Volumen de cliente: 601 kB comprimidos sobre un presupuesto de 650 kB.', 'Alta'],
            ['RNF04', 'Integridad de datos', 'Los importes del pedido se recalculan en el servidor y el stock se descuenta en la misma transacción.', 'El cliente transmite identificadores y cantidades, nunca importes. Prueba: un pedido que excede las existencias se revierte por completo.', 'Alta (Mandatorio)'],
            ['RNF05', 'Accesibilidad', 'La interfaz cumple la norma WCAG 2.1 en nivel AA.', 'Auditoría automatizada con axe-core sobre 10 rutas en ambos idiomas: 0 infracciones.', 'Alta'],
            ['RNF06', 'Internacionalización', 'La totalidad del texto visible existe en español y portugués, conmutables sin recarga.', 'El diccionario portugués está tipado de forma que la ausencia de una clave impide la compilación.', 'Alta'],
            ['RNF07', 'Usabilidad', 'Objetivo táctil mínimo de 44 píxeles, respeto de la preferencia de movimiento reducido y mensajes de error explícitos.', 'Prueba automatizada de navegación por teclado, gestión del foco en diálogos y ausencia de contenido invisible con movimiento reducido.', 'Alta'],
            ['RNF08', 'Compatibilidad', 'Funcionamiento correcto en navegadores de escritorio y móviles vigentes.', 'Batería de pruebas ejecutada en dos perfiles de dispositivo: escritorio y móvil.', 'Media-Alta'],
            ['RNF09', 'Tolerancia a fallos', 'Un fallo del registro interno no debe impedir la venta. Solo la falta de existencias detiene el pedido.', 'Prueba automatizada: con la base sin catálogo importado, el recorrido de compra se completa igualmente hasta la generación del mensaje.', 'Alta'],
            ['RNF10', 'Trazabilidad', 'Todo pedido queda registrado antes de abrir la conversación, con su estado, importes y tasa históricos.', 'Numeración correlativa por secuencia de base de datos. El pedido se persiste aun cuando el cliente no envíe el mensaje.', 'Alta'],
            ['RNF11', 'Disponibilidad', 'Continuidad del servicio durante el horario comercial.', 'Nivel objetivo del 99.9 % de lunes a sábado, de 08:00 a 20:00.', 'Alta'],
            ['RNF12', 'Fiabilidad y respaldo', 'Resguardo periódico de la información ante fallos.', 'Copias de seguridad automáticas diarias provistas por la plataforma de base de datos.', 'Alta'],
            ['RNF13', 'Mantenibilidad', 'Código verificado de forma automatizada y decisiones estructurales documentadas.', '72 pruebas unitarias y 35 pruebas de extremo a extremo. Verificación de tipos y análisis estático sin advertencias. Registro de decisiones en docs/adr/.', 'Media-Alta'],
            ['RNF14', 'Privacidad', 'Se recolecta únicamente el dato imprescindible para concretar la entrega.', 'No se solicita documento de identidad, fecha de nacimiento ni dato de pago alguno. No existe ningún campo donde introducirlos.', 'Alta'],
          ],
          [900, 1700, 2400, 2626, 1400],
        ),

        h2('3.6 Otros Requisitos'),
        bullet('Protección de datos personales: el sistema recolecta nombre, apellido, teléfono y dirección de entrega, con la única finalidad de concretar el pedido. No se ceden a terceros ni se emplean con fines publicitarios.'),
        bullet('Veracidad de la información comercial: los importes en guaraníes y reales se rotulan expresamente como referenciales y derivados de una tasa fija, sin constituir cotización en firme.'),
        bullet('Origen del material gráfico: las fotografías de producto proceden de material de prensa de los fabricantes. Su procedencia se documenta individualmente en el archivo public/products/SOURCES.md, con la página oficial y el archivo de origen de cada imagen.'),
        bullet('Ausencia de tratamiento de datos de pago: el sistema no solicita, no transmite y no almacena datos de tarjeta ni credenciales bancarias, por lo que no le resultan aplicables las exigencias de la norma PCI-DSS.'),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════ 4 APÉNDICES
        h1('4. Apéndices'),
        h2('4.1 Apéndice A — Modelo de datos preliminar'),
        p('Relación de tablas del esquema relacional y su finalidad:'),
        tabla(
          ['Tabla', 'Finalidad', 'Claves y restricciones principales'],
          [
            ['categories', 'Categorías del catálogo, con su denominación bilingüe y orden de presentación.', 'PK: slug'],
            ['products', 'Productos, con precio en dólares, existencias, ficha técnica y datos de compatibilidad.', 'PK: id · UNIQUE: slug, ref · FK: category_slug'],
            ['product_variants', 'Variantes de un producto, con SKU, ejes, precio y existencias propias.', 'PK: id · UNIQUE: sku · FK: product_id'],
            ['shipping_zones', 'Zonas de entrega con costo y umbral de bonificación.', 'PK: id · UNIQUE: slug'],
            ['coupons', 'Cupones de descuento, con vigencia, compra mínima y límite de usos.', 'PK: id · UNIQUE: código en mayúsculas · CHECK: porcentaje ≤ 100'],
            ['orders', 'Pedidos registrados, con estado, importes y tasa de cambio históricos.', 'PK: id · UNIQUE: number (secuencia) · FK: zone_slug'],
            ['order_items', 'Líneas de cada pedido, con copia del nombre, SKU y precio del momento.', 'PK: id · FK: order_id, product_id, variant_id · CHECK: qty > 0'],
            ['settings', 'Configuración por clave: tasa de cambio, umbrales comerciales y contacto.', 'PK: key'],
            ['admin_users', 'Usuarios habilitados para administrar. Consultada por las políticas de seguridad.', 'PK: user_id · UNIQUE: username'],
          ],
          [1900, 3626, 3500],
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),
        p('Funciones almacenadas:'),
        tabla(
          ['Función', 'Tipo', 'Finalidad'],
          [
            ['is_admin()', 'STABLE, SECURITY DEFINER', 'Determina si la sesión vigente pertenece a un administrador. Invocada por las políticas de seguridad de todas las tablas.'],
            ['validate_coupon(código, subtotal)', 'STABLE, SECURITY DEFINER', 'Valida un cupón y devuelve el descuento ya calculado, sin exponer el listado de cupones.'],
            ['place_order(líneas, cliente, zona, cupón)', 'VOLATILE, SECURITY DEFINER', 'Registra el pedido de forma atómica: relee precios, aplica cupón, descuenta existencias y persiste pedido y líneas.'],
            ['touch_updated_at()', 'TRIGGER', 'Actualiza la marca temporal de modificación en cada escritura.'],
          ],
          [2600, 2200, 4226],
        ),

        h2('4.2 Apéndice B — Formatos de salida'),
        p('El sistema genera dos formatos de mensaje estructurado. Ambos codifican su contenido mediante encodeURIComponent antes de la transmisión y expresan todo importe en guaraníes.'),
        p('Formato 1 — Compra directa desde la ficha de producto', { run: { bold: true } }),
        p('Incluye encabezado de saludo, denominación del producto y su variante si corresponde, código de referencia, cantidad, precio unitario, enlace a la ficha, total y solicitud de confirmación de disponibilidad.'),
        p('Restricción de juego de caracteres', { run: { bold: true } }),
        p('Ambos formatos se restringen al Plano Multilingüe Básico de Unicode. La transferencia del enlace desde el navegador hacia la aplicación de mensajería degrada los caracteres situados fuera de dicho plano —entre ellos la totalidad de los pictogramas emoji— y los sustituye por el carácter de reemplazo. La estructura del mensaje se sustenta, por tanto, en el marcado de negrita, la sangría y los filetes de separación, todos ellos representables dentro del plano básico y verificados como íntegros en el cliente de destino. Dos casos de prueba automatizados impiden la reintroducción de caracteres fuera de dicho rango.'),
        p('Formato 2 — Pedido completo desde el checkout', { run: { bold: true } }),
        p('Incluye encabezado, número de pedido, una línea numerada por pieza con su código, cantidad y subtotal, el subtotal general, la línea de cupón cuando corresponde, la zona de entrega con la indicación de que el envío se acuerda en la conversación, el total de las piezas, el bloque de datos de entrega y la solicitud de confirmación. Las líneas que no aplican se omiten en lugar de imprimirse vacías.'),

        h2('4.3 Apéndice C — Resultados de verificación'),
        p('Mediciones obtenidas sobre la versión correspondiente a esta especificación:'),
        tabla(
          ['Verificación', 'Alcance', 'Resultado'],
          [
            ['Verificación de tipos', 'Totalidad del código fuente en modo estricto', 'Sin errores'],
            ['Análisis estático', 'Totalidad del código fuente', 'Sin advertencias'],
            ['Pruebas unitarias', '93 casos sobre dominio, carrito, compatibilidad, búsqueda, moneda, arranque del configurador, mensajería y material gráfico', '93 correctas'],
            ['Pruebas de extremo a extremo', '85 casos en perfiles de escritorio y móvil', '85 correctas'],
            ['Auditoría de accesibilidad', '10 rutas en ambos idiomas, norma WCAG 2.1 AA', '0 infracciones'],
            ['Presupuesto de código de cliente', 'Totalidad del JavaScript transferido', '624 kB de 650 kB'],
            ['Compilación de producción', 'Generación estática del sitio', '99 páginas generadas'],
          ],
          [2600, 4426, 2000],
        ),

        h2('4.4 Apéndice D — Glosario de negocio'),
        tabla(
          ['Término de negocio', 'Significado en el contexto de Sky Import'],
          [
            ['Últimas unidades', 'Estado derivado que se aplica a un producto cuyas existencias son iguales o inferiores al umbral configurado.'],
            ['Envío a coordinar', 'Régimen único de entrega del sistema. Ninguna pantalla exhibe un importe de flete; el importe que se muestra corresponde exclusivamente a las piezas y así queda rotulado.'],
            ['Precio de vitrina', 'Importe redondeado que se publica: al millar en guaraníes y al décimo en reales.'],
            ['Iniciado por WhatsApp', 'Estado inicial de todo pedido: el detalle fue transmitido pero la operación aún no fue confirmada por el vendedor.'],
            ['Código de referencia', 'Identificador interno del producto, legible y dictable por teléfono.'],
            ['Bloqueo de compatibilidad', 'Incompatibilidad que impide físicamente el ensamblaje o el funcionamiento del equipo.'],
            ['Aviso de compatibilidad', 'Advertencia sobre una combinación que funciona pero opera al límite de su especificación.'],
          ],
          [2600, 6426],
        ),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
writeFileSync(`${DIR}\\SRS-Sky-Import.docx`, buffer)
console.log('OK -> SRS-Sky-Import.docx (' + Math.round(buffer.length / 1024) + ' kB)')

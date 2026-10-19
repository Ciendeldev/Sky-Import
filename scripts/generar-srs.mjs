/**
 * Genera el documento SRS (IEEE 830 / ISO 29148) de Sky Import.
 *
 * Sigue la plantilla de la cátedra (UNISAL — Taller de Lenguaje 135) e inserta
 * las veintisiete figuras rasterizadas desde SVG.
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
import { createRequire } from 'node:module'

const require = createRequire(process.env.CODEX_NODE_MODULES
  ? join(process.env.CODEX_NODE_MODULES, '__srs__.cjs')
  : import.meta.url)
const {
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
  VerticalAlign,
  WidthType,
} = require('docx')

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'srs')

// A4 con márgenes de 20 mm: las figuras de 480 pt caben sin invadirlos.
const W = 9638
const AZUL = '000000'
const GRIS = 'F2F4F7'
// Sombreado alterno de filas. Muy tenue a propósito: en tablas de veinte filas
// la banda cebra guía el ojo, pero si se nota compite con el contenido.
const CEBRA = 'F7F9FB'

// ─────────────────────────────────────────────────────────────── utilidades

const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120, line: 276 }, keepNext: Boolean(opts.run?.bold), ...opts, children: [new TextRun({ text, ...opts.run })] })

const h1 = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 400, after: 200 },
  })
const h2 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 280, after: 140 } })
const h3 = (text) =>
  new Paragraph({ text, heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 220, after: 120 } })

const bullet = (text) =>
  new Paragraph({ text, numbering: { reference: 'vinetas', level: 0 }, spacing: { after: 80 } })

/** Celda de tabla. */
function cell(text, { w, bold = false, fill, align, size = 20 } = {}) {
  const lineas = Array.isArray(text) ? text : [text]
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: Object.fromEntries(['top','bottom','left','right'].map(side => [side, { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' }])),
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: lineas.map(
      (l) =>
        new Paragraph({
          alignment: align,
          spacing: { after: 40, line: 260 },
          children: [new TextRun({ text: String(l).replace(/Figura (\d+[ab]?)/g, 'Figura\u00a0$1'), bold, size, color: '000000' })],
        }),
    ),
  })
}

/** Tabla con encabezado. */
function tabla(encabezados, filas, anchos) {
  const total = anchos.reduce((a,b) => a+b, 0)
  anchos = anchos.map(ancho => Math.round(ancho / total * W))
  anchos[anchos.length - 1] += W - anchos.reduce((a,b) => a+b, 0)
  return new Table({
    columnWidths: anchos,
    width: { size: W, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: encabezados.map((h, i) => cell(h, { w: anchos[i], bold: true, fill: 'D6E4EC' })),
      }),
      ...filas.map(
        (fila, n) =>
          new TableRow({
            cantSplit: true,
            children: fila.map((c, i) => cell(c, { w: anchos[i], fill: n % 2 ? CEBRA : undefined })),
          }),
      ),
    ],
  })
}

/** Ficha de un requisito funcional, con la estructura exacta de la plantilla. */
function requisito(rf) {
  const etiqueta = 2500
  const valor = W - etiqueta
  const fila = (k, v) =>
    new TableRow({ cantSplit: true, children: [cell(k, { w: etiqueta, bold: true, fill: GRIS }), cell(v, { w: valor })] })

  return [
    new Paragraph({
      text: `${rf.id}: ${rf.nombre}`,
      heading: HeadingLevel.HEADING_3,
      pageBreakBefore: true,
      keepNext: true,
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
        fila('Condiciones de Salida y Efectos sobre los Datos', rf.post),
        fila('Representación gráfica', rf.figuras),
        fila('Requisitos No Funcionales relacionados', rf.rnf),
        fila('Prioridad / Criterio de Aceptación', rf.prioridad),
      ],
    }),
    ...(rf.ficha
      ? figura(
          `rf-${rf.id.toLowerCase()}.png`,
          640,
          `Figura ${rf.ficha.numero} — ${rf.id}. Vistas de la función: quién la usa, cómo responde el sistema${rf.ficha.componentes ? ' y de qué componentes se sirve' : ''}.`,
          true,
        )
      : []),
    new Paragraph({ text: '', spacing: { after: 120 } }),
  ]
}

/** Ancho y alto de un PNG, leídos de su cabecera IHDR. Evita anotar a mano las
 *  proporciones de cada figura, que es donde se cuelan las imágenes deformadas. */
function medidaPng(archivo) {
  const b = readFileSync(`${DIR}\\${archivo}`)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

/** Figura escalada al ancho del cuerpo del documento, conservando proporción. */
function figura(archivo, ancho, pie, salto = false) {
  const m = medidaPng(archivo)
  return imagen(archivo, ancho, Math.round((ancho * m.h) / m.w), pie, salto)
}

/** Imagen sin numerar. Un logotipo no es una figura y no lleva pie. */
function sello(archivo, ancho) {
  const m = medidaPng(archivo)
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [
      new ImageRun({
        type: 'png',
        data: readFileSync(`${DIR}\\${archivo}`),
        transformation: { width: ancho, height: Math.round((ancho * m.h) / m.w) },
      }),
    ],
  })
}

function imagen(archivo, ancho, alto, pie, salto = false) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      pageBreakBefore: salto,
      keepNext: true,
      spacing: { before: 80, after: 80 },
      children: [
        new ImageRun({
          type: 'png',
          data: readFileSync(`${DIR}\\${archivo}`),
          altText: { title: archivo, description: pie, name: archivo },
          transformation: { width: ancho, height: alto },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: pie, size: 18, italics: true, color: '5B6875' })],
    }),
  ]
}

// ═══════════════════════════════════════════════ requisitos funcionales

const RF = [
  {
    id: 'RF01',
    ficha: { numero: 3, componentes: false },
    figuras:
      'Figura 24b, RF01. Figura 25, componentes «Sesión y autorización» y «Autenticación». Ficha completa de la función: Figura 3.',
    nombre: 'Autenticación del administrador',
    sintaxis:
      'Cuando el operador ingrese su nombre de usuario y contraseña [Condición], el módulo de seguridad [Sujeto] deberá verificar [Acción] las credenciales mediante Supabase Auth [Objeto] con un tiempo de respuesta objetivo menor a 2 segundos [Restricción].',
    descripcion:
      'El sistema restringe el acceso al panel a cuentas autenticadas con pertenencia vigente en admin_users. La pantalla solicita un nombre de usuario; una acción del servidor recibe las credenciales por HTTPS, resuelve el correo interno e invoca signInWithPassword de Supabase Auth. La aplicación no consulta ni compara directamente hashes de auth.users.',
    pre: [
      '1. El usuario abre la ruta /admin/acceso.',
      '2. Los servicios de autenticación y datos de Supabase están disponibles.',
      '3. Existe una cuenta aprovisionada inicialmente o creada por un moderador, con acceso vigente al panel.',
    ],
    post: [
      '1. Supabase Auth verifica las credenciales recibidas mediante su API de autenticación.',
      '2. Si la autenticación resulta válida, se establece la sesión y se consulta la pertenencia y el estado de acceso en admin_users.',
      '3. Si la cuenta no pertenece al panel o tiene el acceso retirado, se cierra la sesión y se deniega el ingreso.',
      '4. Si falla la autenticación, se muestra un mensaje genérico que no revela si el error fue el usuario o la contraseña. Una cuenta autenticada sin acceso vigente recibe el motivo de la denegación.',
    ],
    rnf: 'RNF01 (Seguridad), RNF02 (Control de acceso), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Criterio de aceptación: una cuenta válida con acceso vigente accede al tablero; una cuenta ausente de admin_users o retirada no accede. El objetivo temporal se verifica por separado de la redirección de rutas sin sesión.',
  },
  {
    id: 'RF02',
    ficha: { numero: 4, componentes: true },
    figuras:
      'Figura 24a, RF02. Figura 1, catálogo y filtros. Figura 25, componente «Vitrina y ficha». Ficha completa de la función: Figura 4.',
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
    ficha: { numero: 5, componentes: false },
    figuras:
      'Figura 24a, RF03. Figura 1, catálogo y filtros de la tienda pública. Ficha completa de la función: Figura 5.',
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
    ficha: { numero: 6, componentes: false },
    figuras:
      'Figura 24a, RF04. Figura 2, selección de variante y cantidad. Ficha completa de la función: Figura 6.',
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
    ficha: { numero: 7, componentes: true },
    figuras:
      'Figura 24a, RF05. Figura 2, rama de compra directa y preparación del mensaje simple. Ficha completa de la función: Figura 7.',
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
      '2. Se abre api.whatsapp.com/send con el mensaje codificado mediante encodeURIComponent. El formato incluye caracteres Unicode y emojis; su visualización depende del cliente de WhatsApp y del dispositivo.',
    ],
    rnf: 'RNF07 (Usabilidad), RNF08 (Compatibilidad móvil)',
    prioridad:
      'Alta. Caso de prueba automatizado: el enlace generado apunta al número comercial y su parámetro de texto contiene el encabezado de producto, el código y el total en guaraníes.',
  },
  {
    id: 'RF06',
    ficha: { numero: 8, componentes: false },
    figuras:
      'Figura 24a, RF06. Figura 25, componente «Carrito y configurador». Ficha completa de la función: Figura 8.',
    nombre: 'Gestión del carrito de compras',
    sintaxis:
      'Cuando el cliente agregue, modifique o elimine una línea [Condición], el módulo de carrito [Sujeto] deberá persistir [Acción] el estado resultante en el almacenamiento local del navegador [Objeto], conservándolo entre visitas [Restricción].',
    descripcion:
      'El carrito conserva identificadores y cantidades y, cuando corresponde, una copia de la variante seleccionada que incluye su precio. Esa copia puede mostrar un precio anterior al vigente. Dos variantes de una pieza constituyen líneas distintas. El registro del pedido revalida los precios y las existencias en la base de datos; si tiene éxito, el mensaje utiliza los importes persistidos.',
    pre: ['1. El navegador permite el uso de almacenamiento local.'],
    post: [
      '1. Sin escritura en base de datos: el carrito es estado del cliente hasta que se confirma el pedido.',
      '2. Al recuperar el carrito se descartan productos ausentes y se limitan cantidades según el catálogo cargado. Esta comprobación visual no sustituye la validación transaccional de las existencias y variantes al registrar el pedido.',
    ],
    rnf: 'RNF04 (Integridad), RNF07 (Usabilidad)',
    prioridad:
      'Media-Alta. Caso de prueba automatizado: el carrito sobrevive a una recarga completa de página conservando la cantidad. Cubierto por diez pruebas unitarias.',
  },
  {
    id: 'RF07',
    ficha: { numero: 9, componentes: false },
    figuras:
      'Figura 24a, RF07. Figura 1, configurador. Figura 25, componente «Carrito y configurador». Ficha completa de la función: Figura 9.',
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
    ficha: { numero: 10, componentes: true },
    figuras:
      'Figura 24a, RF08. Figura 1, monedas USD, PYG y BRL de la tienda pública. Ficha completa de la función: Figura 10.',
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
    ficha: { numero: 11, componentes: false },
    figuras:
      'Figura 24a, RF09. Figura 26, fragmento «opt» de validación del cupón. Ficha completa de la función: Figura 11.',
    nombre: 'Validación y aplicación de cupón de descuento',
    sintaxis:
      'Cuando el cliente introduzca un código de cupón en el checkout [Condición], la función de validación alojada en la base de datos [Sujeto] deberá comprobar y calcular [Acción] el descuento aplicable [Objeto], sin exponer en ningún caso el listado de cupones existentes [Restricción].',
    descripcion:
      'La validación se ejecuta en la base de datos mediante una función con privilegios definidos, que devuelve el descuento calculado o el motivo del rechazo. La tabla de cupones no permite lectura pública del listado. Esta restricción no impide probar códigos individuales a través del validador ni constituye una garantía contra su adivinación.',
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
    ficha: { numero: 12, componentes: true },
    figuras:
      'Figura 24a, RF10. Figura 2, solicitud de place_order(). Figura 26, invocación y alternativas de registro. Ficha completa de la función: Figura 12.',
    nombre: 'Registro del pedido',
    sintaxis:
      'Cuando el cliente confirme el envío del pedido [Condición], la función transaccional de registro [Sujeto] deberá releer los precios, aplicar el descuento, descontar el stock y persistir el pedido [Acción] en las tablas de pedidos y líneas de pedido [Objeto], en una única transacción atómica [Restricción].',
    descripcion:
      'Constituye la operación crítica del sistema. El cliente transmite qué solicita, nunca cuánto cuesta: los importes se recalculan íntegramente en el servidor de base de datos, lo que impide manipular el total desde el navegador. El pedido nace con el estado «Iniciado por WhatsApp».',
    pre: [
      '1. El carrito contiene al menos una línea.',
      '2. Los campos nombre, apellido y teléfono están completos.',
      '3. Si la zona seleccionada lo requiere, la dirección exacta está informada.',
      '4. Para persistir el pedido, la base de datos debe estar disponible. Ante un fallo técnico puede continuarse por WhatsApp sin registro, según RNF09; la falta de existencias sí bloquea la operación.',
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
    ficha: { numero: 13, componentes: true },
    figuras:
      'Figura 24a, RF11. Figura 25, componente «Checkout y redactor». Figura 26, pasos 7 y 8. Ficha completa de la función: Figura 13.',
    nombre: 'Generación del mensaje de pedido completo',
    sintaxis:
      'Cuando el registro del pedido finalice correctamente o se habilite la continuación sin registro por un fallo técnico [Condición], el generador de mensajes del navegador [Sujeto] deberá componer [Acción] el detalle de productos, cupón, entrega y total [Objeto], codificado para su transmisión por WhatsApp [Restricción].',
    descripcion:
      'Produce el mensaje de Formato 2 en el navegador. El dólar estadounidense es la moneda base de precios y la referencia comercial indicada en la tienda; el mensaje presenta importes convertidos a guaraníes. La moneda y las condiciones efectivas de pago se acuerdan por WhatsApp, fuera del sistema. Si el pedido quedó registrado, las líneas, los totales y la tasa se toman de los valores persistidos. En la continuación sin registro se utilizan los datos disponibles en la página, sujetos a confirmación comercial. El mensaje incluye emojis y líneas de producto sin numeración ordinal; omite cupón y observaciones cuando no corresponden.',
    pre: ['1. El pedido se registró o se habilitó la continuación sin registro por un fallo técnico. Un rechazo por falta de existencias no genera el mensaje de pedido.'],
    post: [
      '1. Operación de solo lectura sobre los datos devueltos por el registro del pedido o, sin registro, sobre los de la página.',
      '2. Se abre la dirección oficial api.whatsapp.com/send con el contenido codificado mediante encodeURIComponent.',
      '3. El carrito del cliente se vacía tras la apertura.',
    ],
    rnf: 'RNF06 (Internacionalización), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Criterio de aceptación: el mensaje contiene encabezado, una línea por pieza con su código y cantidad, datos de entrega y total en guaraníes; conserva los valores persistidos cuando hubo registro y no incluye bloques vacíos. El formato se comprueba mediante pruebas unitarias de mensajería.',
  },
  {
    id: 'RF12',
    ficha: { numero: 14, componentes: true },
    figuras:
      'Figura 24b, RF12. Figura 1, productos y existencias del panel. Ficha completa de la función: Figura 14.',
    nombre: 'Administración de productos y variantes',
    sintaxis:
      'Cuando el administrador autenticado confirme el formulario de producto [Condición], el módulo de inventario [Sujeto] deberá crear o actualizar [Acción] el registro correspondiente y sus variantes [Objeto], validando previamente unicidad de código y coherencia de precio [Restricción].',
    descripcion:
      'Permite el alta, modificación y baja de productos y de sus variantes. Lo que el formulario edita —precio, existencias, nombre, descripción y visibilidad— se publica desde la base de datos, que es también la que utiliza el registro del pedido para calcular y guardar sus importes. La ficha técnica y los datos de compatibilidad se editan en el catálogo tipado del proyecto y no como texto libre, dado que alimentan el motor de compatibilidad y una edición no validada produciría armados imposibles sin aviso.',
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
    ficha: { numero: 15, componentes: false },
    figuras:
      'Figura 24b, RF13. Figura 1, productos y existencias. Figura 26, nota sobre validación y descuento de stock. Ficha completa de la función: Figura 15.',
    nombre: 'Control de stock con alertas de mínimo',
    sintaxis:
      'Cuando las unidades de un producto activo desciendan hasta el umbral configurado o por debajo [Condición], el módulo de inventario [Sujeto] deberá señalar [Acción] dicho producto en el panel de alertas [Objeto], diferenciando el estado agotado del estado de últimas unidades [Restricción].',
    descripcion:
      'La disponibilidad se calcula a partir de las unidades y del umbral propio del producto o, en su ausencia, del general. En el listado de productos se suman las unidades de las variantes activas cuando existen. La consulta de alertas utiliza products.units. La equivalencia entre ese campo y la suma de variantes requiere comprobación y, cuando corresponda, conciliación; la versión actual no garantiza una única regla de agregación en ambas vistas.',
    pre: ['1. Existe una sesión de administrador activa.'],
    post: [
      '1. UPDATE sobre products.units al ajustar el stock desde el listado.',
      '2. SELECT sobre products con active = true para componer el listado de alertas, ordenado con los agotados en primer lugar.',
      '3. La clasificación de las alertas se calcula sobre products.units y el umbral aplicable; no se almacena como un estado separado.',
    ],
    rnf: 'RNF04 (Integridad), RNF07 (Usabilidad)',
    prioridad:
      'Alta. Caso de prueba: fijar las unidades de una pieza en cero la clasifica como agotada en el tablero; fijarlas en un valor igual al umbral la clasifica como últimas unidades.',
  },
  {
    id: 'RF14',
    ficha: { numero: 16, componentes: true },
    figuras:
      'Figura 24b, RF14. Figura 1, tasa, cupones y pedidos del panel. Ficha completa de la función: Figura 16.',
    nombre: 'Configuración de precios y tasa de cambio',
    sintaxis:
      'Cuando el administrador registre una nueva tasa de cambio [Condición], el módulo de configuración [Sujeto] deberá persistir y propagar [Acción] dicho valor a la totalidad de la tienda y de los mensajes generados [Objeto], sin necesidad de un nuevo despliegue [Restricción].',
    descripcion:
      'Centraliza la tasa de guaraníes y reales por dólar, el mes de referencia y el umbral de aviso de últimas unidades. El costo del envío no figura en el sistema: se acuerda por la vía de mensajería. La tienda pública y los mensajes emplean exclusivamente el valor almacenado; el código conserva únicamente un valor de respaldo, que se aplica solo si la base de datos no responde. El sistema rechaza toda tasa fuera de un rango de plausibilidad: la notación local del guaraní emplea el punto como separador de millar, y un campo numérico lo descarta, de modo que «7.400» se registraría como «7» y dividiría por mil la totalidad de los precios publicados.',
    pre: [
      '1. Existe una sesión de administrador activa.',
      '2. El guaraní por dólar se sitúa entre 1000 y 20000, y el real entre 1 y 50.',
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
    ficha: { numero: 17, componentes: false },
    figuras:
      'Figura 24b, RF15. Figura 1, tasa, cupones y pedidos del panel. Ficha completa de la función: Figura 17.',
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
    ficha: { numero: 18, componentes: false },
    figuras:
      'Figura 24b, RF16. Figura 1, tasa, cupones y pedidos del panel. Ficha completa de la función: Figura 18.',
    nombre: 'Seguimiento interno de pedidos',
    sintaxis:
      'Cuando el administrador consulte el historial [Condición], el módulo de pedidos [Sujeto] deberá presentar [Acción] hasta los 200 pedidos registrados más recientes con su estado, importes, líneas y datos de entrega [Objeto], ordenados del más reciente al más antiguo [Restricción].',
    descripcion:
      'Permite seguir los pedidos efectivamente registrados mediante el checkout, con estado inicial «Iniciado por WhatsApp», y actualizarlos a confirmado, en preparación, entregado o cancelado. Admite observaciones internas. El historial muestra hasta 200 pedidos y el tablero utiliza los 50 más recientes; este límite no elimina registros anteriores. La compra directa y la continuación por fallo técnico sin registro no aparecen en el historial. Los importes mostrados son los persistidos al registrar el pedido.',
    pre: ['1. Existe una sesión de administrador activa.'],
    post: [
      '1. SELECT sobre orders con unión a order_items, restringido por la política RLS que exige pertenencia a admin_users.',
      '2. UPDATE sobre orders.status y orders.admin_note al modificar el seguimiento.',
      '3. Los importes no se recalculan: se preservan los valores y la tasa de cambio grabados con el pedido.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF04 (Integridad), RNF10 (Trazabilidad)',
    prioridad:
      'Alta. Criterio de aceptación: un pedido recién registrado figura con estado «Iniciado por WhatsApp» y su total coincide con el comunicado al cliente. La consulta paginada de todo el historial queda fuera del alcance implementado.',
  },
  {
    id: 'RF17',
    ficha: { numero: 19, componentes: true },
    figuras:
      'Figura 24b, RF17, exclusivo del Moderador. Figura 25, componente «Gestión de cuentas». Ficha completa de la función: Figura 19.',
    nombre: 'Alta de cuentas de administración',
    sintaxis:
      'Cuando el moderador registre una nueva cuenta [Condición], el módulo de configuración [Sujeto] deberá crear [Acción] una identidad de administrador con su nombre de usuario y contraseña [Objeto], sin capacidad de otorgar el rol de moderación [Restricción].',
    descripcion:
      'El panel distingue dos perfiles. El administrador opera la tienda —catálogo, existencias, precios, cupones y pedidos— y no accede a la gestión de cuentas. El moderador suma la potestad de crear usuarios, restablecer contraseñas ajenas y retirar accesos. El rol reside en los metadatos que el proveedor de autenticación reserva al servidor, nunca en un campo editable ni en el formulario, de modo que toda cuenta creada desde el panel nace como administrador.',
    pre: [
      '1. Existe una sesión activa cuyo rol verificado es el de moderador.',
      '2. El nombre de usuario no está en uso y la contraseña alcanza los doce caracteres.',
    ],
    post: [
      '1. Alta de la identidad en el servicio de autenticación, con correo interno determinista.',
      '2. INSERT sobre admin_users estableciendo la pertenencia al panel.',
      '3. Si la pertenencia no llega a registrarse, se elimina la identidad recién creada por esa misma llamada.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF04 (Integridad), RNF15 (Separación de funciones)',
    prioridad:
      'Alta. Caso de prueba: la operación invocada desde una sesión de administrador, eludiendo la interfaz, es rechazada por el servidor y no crea identidad alguna.',
  },
  {
    id: 'RF18',
    ficha: { numero: 20, componentes: true },
    figuras:
      'Figura 24b, RF18. Figura 25, componente «Gestión de cuentas» y políticas RLS dentro de PostgreSQL. Ficha completa de la función: Figura 20.',
    nombre: 'Retiro y restitución del acceso',
    sintaxis:
      'Cuando el moderador retire el acceso de una cuenta [Condición], el sistema [Sujeto] deberá impedir [Acción] tanto el ingreso al panel como las escrituras administrativas protegidas por las políticas de acceso [Objeto], de forma reversible y sin eliminar la identidad de la cuenta [Restricción].',
    descripcion:
      'La baja de un colaborador no elimina su cuenta: se marca la fecha de retiro y se conserva su identidad para poder restituir el acceso. Esta conservación no equivale a una bitácora histórica de las operaciones realizadas por cada administrador. La función de autorización consultada por las políticas de seguridad por fila comprueba el acceso vigente, de modo que una cuenta retirada deja de habilitar escrituras administrativas aunque conserve su sesión. Ninguna cuenta puede retirarse a sí misma ni retirar a otro moderador.',
    pre: [
      '1. Existe una sesión activa cuyo rol verificado es el de moderador.',
      '2. La cuenta afectada es distinta de la propia y no ostenta el rol de moderación.',
    ],
    post: [
      '1. UPDATE sobre admin_users.revoked_at, con marca temporal al retirar y valor nulo al restituir.',
      '2. La función is_admin() deja de autorizar a la cuenta y las políticas que dependen de ella bloquean la escritura administrativa.',
      '3. La identidad y la contraseña se conservan intactas en el servicio de autenticación.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF10 (Trazabilidad), RNF15 (Separación de funciones)',
    prioridad:
      'Alta. Criterio de aceptación: con el acceso retirado, una autenticación válida no habilita el panel, is_admin() devuelve falso y la escritura administrativa queda bloqueada. La evidencia de pruebas se distingue por fecha en el Apéndice C.',
  },
  {
    id: 'RF19',
    ficha: { numero: 21, componentes: false },
    figuras:
      'Figura 24b, RF19, disponible para ambos perfiles. Figura 25, componente «Autenticación». Ficha completa de la función: Figura 21.',
    nombre: 'Cambio de la contraseña propia',
    sintaxis:
      'Cuando un usuario del panel modifique su contraseña [Condición], el módulo de configuración [Sujeto] deberá exigir [Acción] la contraseña vigente antes de aceptar la nueva [Objeto], sin interrumpir la sesión en curso [Restricción].',
    descripcion:
      'Disponible para ambos perfiles sobre la propia cuenta. La contraseña vigente se comprueba contra el servicio de autenticación mediante un cliente aislado y sin cookies, cuya sesión temporal se cierra al terminar, de modo que la comprobación no reemplaza ni invalida la sesión del navegador. Ninguna contraseña figura en el repositorio ni en los registros del sistema.',
    pre: [
      '1. Existe una sesión de panel activa.',
      '2. La nueva contraseña tiene entre doce y ciento veintiocho caracteres, difiere de la vigente y coincide con su repetición.',
    ],
    post: [
      '1. Actualización de la credencial en el servicio de autenticación.',
      '2. Cierre de la sesión auxiliar empleada para la comprobación.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF14 (Privacidad)',
    prioridad:
      'Alta. Caso de prueba: una contraseña vigente incorrecta, o una identidad distinta de la de la sesión, no producen actualización alguna.',
  },
  {
    id: 'RF20',
    ficha: { numero: 22, componentes: true },
    figuras:
      'Figura 24b, RF20. Figura 25, componente «Funciones de base de datos», operación delete_order. Ficha completa de la función: Figura 22.',
    nombre: 'Baja de pedidos con restitución de existencias',
    sintaxis:
      'Cuando el moderador elimine un pedido [Condición], el módulo de pedidos [Sujeto] deberá devolver [Acción] las unidades comprometidas al inventario y suprimir el registro con sus líneas [Objeto], en una única transacción [Restricción].',
    descripcion:
      'Destinado a los registros que no constituyeron una venta. La restitución es imprescindible porque el alta del pedido descuenta las unidades y la disponibilidad del catálogo se deriva de ese valor: una supresión simple dejaría el inventario declarando existencias inferiores a las reales de forma permanente. Las unidades no se devuelven si el pedido consta como entregado, pues en tal caso la mercadería salió efectivamente del local. La confirmación exige transcribir el número del pedido, dado que la operación es irreversible.',
    pre: [
      '1. Existe una sesión activa cuyo rol verificado es el de moderador.',
      '2. El pedido existe y su número ha sido transcrito literalmente.',
    ],
    post: [
      '1. UPDATE sobre products.units y product_variants.units por cada línea, salvo en pedidos entregados.',
      '2. DELETE sobre orders; las líneas se suprimen por integridad referencial en cascada.',
      '3. Ambas operaciones se ejecutan en la misma transacción de base de datos.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF04 (Integridad), RNF15 (Separación de funciones)',
    prioridad:
      'Media-Alta. Criterio de aceptación: la baja de un pedido no entregado restituye las unidades y suprime sus líneas en cascada; un pedido entregado se elimina sin reponer mercadería. La verificación histórica se distingue de las pruebas actuales en el Apéndice C.',
  },
  {
    id: 'RF21',
    ficha: { numero: 23, componentes: true },
    figuras:
      'Figura 24b, RF21. Figura 25, componentes «Gestión de cuentas» y «Autenticación». Ficha completa de la función: Figura 23.',
    nombre: 'Restablecimiento de la contraseña de otra cuenta',
    sintaxis:
      'Cuando un administrador pierda el acceso [Condición], el moderador [Sujeto] deberá poder asignarle [Acción] una contraseña nueva desde el panel [Objeto], sin conocer la anterior y sin poder aplicarlo sobre otro moderador [Restricción].',
    descripcion:
      'Recupera el acceso de un colaborador sin recurrir a correo electrónico ni a la consola del proveedor: las cuentas del panel emplean un correo interno determinista que nadie consulta. La operación no exige la contraseña vigente —el moderador no la conoce ni debe conocerla—, por lo que queda acotada a cuentas de perfil administrador: ni la propia ni la de otro moderador pueden restablecerse por esta vía, de modo que nadie se apodera de una cuenta de igual jerarquía. La pantalla de acceso remite explícitamente a este procedimiento cuando alguien pierde su contraseña.',
    pre: [
      '1. Existe una sesión activa cuyo rol verificado es el de moderador.',
      '2. La cuenta afectada pertenece al panel, es distinta de la propia y su perfil es el de administrador.',
      '3. La contraseña nueva tiene entre doce y ciento veintiocho caracteres y coincide con su repetición.',
    ],
    post: [
      '1. Actualización de la credencial en el servicio de autenticación, mediante la clave de servicio.',
      '2. La contraseña anterior deja de habilitar el ingreso.',
      '3. No se modifica la pertenencia al panel ni el estado de acceso de la cuenta.',
    ],
    rnf: 'RNF02 (Control de acceso), RNF14 (Privacidad), RNF15 (Separación de funciones)',
    prioridad:
      'Media-Alta. Criterio de aceptación: tras el restablecimiento, la contraseña anterior se rechaza y la nueva se acepta; un intento sobre una cuenta de perfil moderador se deniega sin cambios. La verificación histórica se distingue de las pruebas actuales en el Apéndice C.',
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
      document: { run: { font: 'Calibri', size: 22, color: '000000' }, paragraph: { widowControl: true } },
      title: { run: { font: 'Calibri', size: 40, bold: true, color: '000000' } },
      heading1: {
        run: { font: 'Calibri', size: 32, bold: true, color: AZUL },
        paragraph: { keepNext: true, spacing: { before: 360, after: 180 } },
      },
      heading2: {
        run: { font: 'Calibri', size: 26, bold: true, color: AZUL },
        paragraph: { keepNext: true, spacing: { before: 280, after: 140 } },
      },
      heading3: {
        run: { font: 'Calibri', size: 23, bold: true, color: '000000' },
        paragraph: { keepNext: true, spacing: { before: 220, after: 120 } },
      },
    },
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 567, footer: 567 } } },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9D2DA' } },
              children: [
                new TextRun({ text: 'Sky Import — Especificación de Requisitos de Software', size: 16, color: '000000' }),
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
        // Se compone de arriba abajo: la institución que recibe el trabajo, el
        // título de lo que se entrega, la marca del cliente para el que se hizo
        // y, al pie, los datos de identificación. El orden importa: quien
        // corrige busca primero la cátedra y el autor, no el subtítulo.
        new Paragraph({ text: '', spacing: { after: 340 } }),
        sello('unisal.png', 108),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 40 },
          children: [new TextRun({ text: 'UNIVERSIDAD SAN LORENZO', bold: true, size: 30, color: AZUL, characterSpacing: 60 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 30 },
          children: [new TextRun({ text: 'FACULTAD DE INGENIERÍA EN INFORMÁTICA', bold: true, size: 21, color: '000000', characterSpacing: 40 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 620 },
          children: [new TextRun({ text: 'Taller de Lenguaje · Asignatura 135 · Décimo Semestre', size: 19, color: '5B6875' })],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          style: 'Title',
          children: [new TextRun({ text: 'ESPECIFICACIÓN DE REQUISITOS', size: 40, bold: true, color: '12181F', characterSpacing: 30 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: 'DE SOFTWARE', size: 40, bold: true, color: '12181F', characterSpacing: 30 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 500 },
          children: [new TextRun({ text: 'IEEE 830-1998  ·  ISO/IEC/IEEE 29148:2011', size: 19, color: '000000', characterSpacing: 30 })],
        }),

        // Marca del cliente y descripción del negocio.
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: '', size: 2 })],
        }),
        sello('marca.png', 300),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 0 },
          children: [new TextRun({ text: 'Componentes para PC · Ciudad del Este, Paraguay', size: 19, color: '40546B' })],
        }),

        new Paragraph({ text: '', spacing: { after: 620 } }),
        tabla(
          ['Campo', 'Detalle'],
          [
            ['Autor / Estudiante', 'Cielo Medina'],
            ['Docente Evaluador', 'Adrian Lopez'],
            ['Cliente del sistema', 'Sky Import — Ciudad del Este, Paraguay'],
            ['Fecha de Entrega', '12 de octubre de 2026'],
            ['Versión del Documento', '2.2 — Revisión documental final del 12/10/2026'],
          ],
          [2800, 6226],
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─────────────────────────────────── FICHA DE CONTROL
        h1('Ficha de Control del Documento'),
        p('Esta sección registra las versiones documentadas, sus responsables y los cambios incorporados. La revisión de contenido no sustituye la aprobación del cliente o del docente, cuyas firmas se consignan al formalizarla.'),
        tabla(
          ['Fecha', 'Versión', 'Autor(es)', 'Detalles de la Revisión / Cambios'],
          [
            ['09/09/2026', '2.0', 'Cielo Medina', 'Consolidación de los requisitos y del modelado UML, delimitación de medios de pago y carátula institucional.'],
            ['14/09/2026', '2.1', 'Cielo Medina', 'Catálogo con precios y existencias desde la base de datos; mensajes con los importes persistidos del pedido (RF11, RF12 y RF14).'],
            ['12/10/2026', '2.2', 'Cielo Medina', 'Revisión de coherencia entre requisitos, código y diagramas; corrección de conteos, permisos, límites, formatos y evidencias de verificación. Preparación documental para la entrega.'],
          ],
          [1300, 1100, 2200, 4426],
        ),
        new Paragraph({ text: '', spacing: { after: 260 } }),
        h2('Firmas y Aprobaciones del Proyecto'),
        // Las firmas y sus fechas se completan cuando la aprobación ocurre.
        tabla(
          ['Rol / Entidad', 'Firma / Aprobación', 'Fecha'],
          [
            ['Por el Proveedor (Estudiante / Desarrollador)', '', ''],
            ['Por el Cliente (Sky Import)', '', ''],
            ['Docente Evaluador (Adrian Lopez)', '', ''],
          ],
          [3600, 3626, 1800],
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─────────────────────────────────── TABLA DE CONTENIDO
        h1('Tabla de Contenido'),
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
        bullet('Cliente y docente evaluador: como base para revisar y aprobar el alcance del sistema.'),
        p('Este documento es la referencia técnica para el modelado UML, la base de datos, la implementación y su verificación. Los criterios de aceptación expresan el comportamiento requerido; el Apéndice C distingue las comprobaciones realizadas de los objetivos pendientes de medición.'),

        h2('1.2 Ámbito del Sistema'),
        p('El software se identifica oficialmente con el nombre de Sky Import.'),
        p('Objetivos de Negocio', { run: { bold: true } }),
        p('Sky Import es un comercio importador de componentes informáticos situado en Ciudad del Este, Paraguay, en zona de frontera con Brasil y Argentina. Su operación actual presenta las siguientes ineficiencias:'),
        bullet('El catálogo y los precios se comunican de forma manual por mensajería, lo que obliga a repetir la misma información a cada consulta.'),
        bullet('La conversión entre dólares, guaraníes y reales se realiza a mano, con riesgo de error de cálculo y de inconsistencia entre lo cotizado y lo cobrado.'),
        bullet('La falta de un control centralizado de existencias aumenta el riesgo de ofrecer piezas sin stock.'),
        bullet('La ausencia de un registro interno de pedidos dificulta el seguimiento comercial de consultas no concretadas.'),
        p('La automatización de estos procesos persigue los siguientes beneficios estratégicos:'),
        bullet('Reducción del tiempo de atención por consulta, al publicar ficha técnica, disponibilidad y precio en las tres monedas antes del primer contacto.'),
        bullet('Eliminación del error humano de cálculo, mediante conversión automática desde una tasa única configurable.'),
        bullet('Consistencia entre los importes registrados y el mensaje comercial cuando el checkout se completa, mediante recálculo en la base de datos.'),
        bullet('Seguimiento de los pedidos registrados desde el checkout, aunque el cliente no envíe el mensaje. La compra directa y la continuación sin registro por fallo técnico constituyen excepciones.'),
        p('Límites del Sistema', { run: { bold: true } }),
        tabla(
          ['El sistema SÍ hará (In-Scope)', 'El sistema NO hará (Out-Scope)'],
          [
            ['1. Publicación del catálogo con ficha técnica, fotografía, variantes, disponibilidad y precio en tres monedas.', '1. Cobro por cualquier medio electrónico: tarjeta de crédito o débito, pasarela de pagos, billetera con código QR o transferencia automatizada. No existe integración ni campo alguno donde introducir datos de pago.'],
            ['2. Verificación automática de compatibilidad entre componentes antes de la compra.', '2. Gestión de la logística de transporte y del seguimiento físico de los envíos.'],
            ['3. Gestión de existencias con alertas de stock mínimo y agotado.', '3. Liquidación de haberes del personal y contabilidad de la empresa.'],
            ['4. Registro de pedidos del checkout, cuando la base está disponible, con seguimiento de estado e importes históricos.', '4. Emisión de documentos tributarios legales (facturación electrónica).'],
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
            ['Adrian Lopez', 'Docente de Cátedra', 'Supervisión del proceso de software, revisión del alcance académico y evaluación del proyecto.', 'Cátedra Taller de Lenguaje 135'],
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
        bullet('Supabase, documentación de copias de seguridad: https://supabase.com/docs/guides/platform/backups. Consulta: 11/10/2026. Referencia para el alcance del plan y la definición del procedimiento de respaldo.'),

        h2('1.6 Resumen del Documento'),
        p('Este documento consta de cuatro secciones. La primera presenta la introducción, el alcance y el personal involucrado. La segunda describe el producto, los usuarios y las restricciones, e incorpora los diagramas de bloques y de flujo. La tercera especifica las interfaces, los veintiún requisitos funcionales con sus precondiciones y efectos sobre los datos, los quince requisitos no funcionales, las metas de rendimiento y cuatro diagramas UML generales. La cuarta reúne el resumen del modelo de datos, los formatos de salida, la evidencia de verificación y el glosario.'),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════ 2 DESCRIPCIÓN GENERAL
        h1('2. Descripción General'),
        h2('2.1 Perspectiva del Producto'),
        p('Sky Import es un producto de software independiente: no forma parte de un ecosistema corporativo preexistente ni sustituye a un sistema anterior. Administra su propia base de datos relacional y expone una interfaz web pública y un panel de administración restringido.'),
        p('El sistema mantiene tres interfaces lógicas con entidades externas:'),
        bullet('Plataforma Supabase: PostgreSQL para persistencia y seguridad por fila, y Supabase Auth como servicio de autenticación. La aplicación utiliza sus APIs HTTPS.'),
        bullet('Interfaz de mensajería WhatsApp, mediante enlace codificado, que constituye el único canal de cierre de venta.'),
        bullet('Plataforma de alojamiento y red de distribución de contenido, que sirve la aplicación sobre HTTPS.'),
        p('El siguiente diagrama de bloques representa las fronteras del sistema y su interacción con dichas entidades:'),
        ...figura('bloques.png', 640, 'Figura 1 — Diagrama de bloques del sistema Sky Import.', true),
        new Paragraph({ children: [new PageBreak()] }),

        h3('Decisiones de alcance frente a alternativas de diseño'),
        p('La solución prioriza la consulta del catálogo y la preparación del pedido para cerrar la venta por mensajería. La tabla compara decisiones posibles de diseño; no es un estudio de mercado ni afirma que todas las tiendas en línea adopten la misma alternativa.'),
        tabla(
          ['Aspecto', 'Alternativa de diseño', 'Decisión de Sky Import'],
          [
            [
              'Cuenta de usuario',
              'Compra asociada a una cuenta o compra como invitado.',
              'Compra sin cuenta: se solicitan los datos necesarios para coordinar la entrega y se continúa por WhatsApp.',
            ],
            [
              'Cobro',
              'Cobro integrado mediante una pasarela o coordinación externa del pago.',
              'El pago se acuerda fuera del software. La aplicación no solicita ni almacena datos de tarjeta o credenciales bancarias.',
            ],
            [
              'Carrito',
              'Persistencia en el navegador, en el servidor o combinada.',
              'Persistencia local en el navegador, sin cuenta. El registro del pedido es una operación posterior e independiente.',
            ],
            [
              'Cierre de la venta',
              'Confirmación automática, atención por mensajería o combinación de canales.',
              'Abre WhatsApp con piezas, códigos, cantidades e importes para que una persona confirme las condiciones de venta.',
            ],
            [
              'Pedidos no concretados',
              'Registro previo al pago o posterior, según el proceso comercial.',
              'El checkout registra antes de abrir WhatsApp si la base está disponible. La compra directa y el modo sin registro quedan fuera de ese seguimiento.',
            ],
            [
              'Monedas',
              'Una moneda o presentación multimoneda.',
              'Precios base en USD y presentación en USD, PYG y BRL mediante tasas configuradas; los importes derivados son referenciales.',
            ],
            [
              'Idioma',
              'Un idioma, traducciones editoriales o traducción automática.',
              'Tienda pública y mensajes comerciales en español y portugués, mediante diccionarios tipados. El panel administrativo está en español.',
            ],
            [
              'Compatibilidad entre piezas',
              'Validación por el comprador, asesoramiento humano o reglas automáticas.',
              'Verificación automática de un conjunto definido de reglas de compatibilidad; no sustituye la revisión de especificaciones del fabricante.',
            ],
          ],
          [1700, 3200, 4126],
        ),
        p('El alcance vigente comprende publicar el catálogo, calcular importes, comprobar reglas de compatibilidad y preparar el pedido. El registro interno se realiza cuando se cumplen las condiciones del checkout; la confirmación comercial y el cobro corresponden a la atención por WhatsApp.', { spacing: { before: 160, after: 160 } }),

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
        ...figura('flujo.png', 640, 'Figura 2 — Diagrama de flujo del proceso de compra y cierre de venta.', true),
        new Paragraph({ children: [new PageBreak()] }),

        h2('2.3 Características de los Usuarios'),
        tabla(
          ['Tipo de Usuario / Rol', 'Formación / Nivel Técnico', 'Módulos / Permisos Autorizados', 'Actividades Principales'],
          [
            [
              'Moderador (titular del comercio)',
              'Usuario avanzado, con experiencia media en sistemas de gestión. No requiere conocimientos de programación.',
              'Cuanto alcanza el administrador, y además el alta de cuentas, el restablecimiento de contraseñas ajenas, el retiro y la restitución de accesos, y la baja de pedidos. El rol reside en los metadatos que el proveedor de autenticación reserva al servidor, de modo que no puede otorgarse desde la aplicación.',
              'Gobierno del personal con acceso al panel y limpieza de registros que no constituyeron una venta, además de la operación ordinaria de la tienda.',
            ],
            [
              'Administrador (personal del comercio)',
              'Usuario con formación operativa. No requiere conocimientos de programación.',
              'Inventario, variantes, precios, tasa de cambio, cupones y pedidos. Verificado por pertenencia vigente a la tabla admin_users. Sin acceso a la gestión de cuentas ni a la baja de pedidos, restricción comprobada en el servidor y no únicamente ocultando controles.',
              'Carga y actualización del catálogo, ajuste de existencias, definición de precios y tasa, generación de cupones y seguimiento de pedidos.',
            ],
            [
              'Cliente / Visitante',
              'Usuario final externo, de formación diversa. Se asume competencia básica en navegación web y uso de mensajería.',
              'Lectura pública del catálogo y uso del configurador. El checkout puede registrar un pedido mediante una función controlada, sin habilitar lectura de pedidos ajenos ni acceso al panel.',
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
        bullet('La interfaz pública y los mensajes comerciales se ofrecen en español y portugués mediante diccionarios tipados. El panel administrativo se mantiene en español.'),
        bullet('La credencial de acceso administrativo no puede figurar en el repositorio de código bajo ninguna forma, ni en claro ni cifrada.'),
        new Paragraph({
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun({ text: 'Tecnología de implementación. ', bold: true, color: '000000' }),
            new TextRun({
              text: 'Sky Import está implementado en TypeScript sobre Node.js, con React y Next.js, y utiliza PostgreSQL mediante Supabase. El proyecto fue presentado al docente Adrián, quien aprobó el uso de TypeScript/Next.js para esta solución. Esta elección mantiene la arquitectura cliente/servidor, la interfaz web y el control de acceso por roles.',
              color: '000000',
            }),
          ],
        }),

        h3('Medios de pago expresamente no implementados'),
        p('Los siguientes medios de pago no están integrados ni forman parte del alcance vigente. El sistema prepara la información del pedido; la transacción económica se acuerda fuera del software.'),
        tabla(
          ['Medio de pago', 'Situación en el sistema', 'Qué ocurre en su lugar'],
          [
            [
              'Tarjeta de crédito o débito',
              'No implementado. No existe formulario, campo ni almacenamiento de datos de tarjeta en ninguna pantalla ni en el modelo de datos.',
              'El cobro se acuerda en la conversación de WhatsApp y se concreta en el local.',
            ],
            [
              'Pasarela de pagos (Pagopar, Bancard y equivalentes)',
              'No integrada. El sistema no realiza llamada alguna a servicios de cobro ni recibe notificaciones de acreditación.',
              'El estado del pedido lo actualiza el operador desde el panel, según lo que constate por fuera.',
            ],
            [
              'Billetera electrónica con código QR',
              'No implementado. El sistema no genera ni interpreta códigos QR de cobro.',
              'Si el cliente paga por billetera, lo coordina por la conversación; el sistema no se entera.',
            ],
            [
              'Transferencia bancaria automatizada',
              'No implementada. No hay conciliación automática ni verificación de acreditación.',
              'El operador confirma la transferencia por su cuenta y mueve el estado del pedido a mano.',
            ],
            [
              'Financiación en cuotas',
              'No implementada. El sistema no calcula intereses, planes ni vencimientos.',
              'Cualquier acuerdo de cuotas es ajeno al software y no queda registrado en él.',
            ],
            [
              'Emisión de comprobante tributario',
              'No implementada. El pedido registrado no es una factura ni sustituye a ninguna.',
              'La documentación legal se emite por los medios habituales del comercio.',
            ],
          ],
          [2100, 3600, 3326],
        ),
        p('En consecuencia, el importe que el sistema calcula y transmite tiene valor informativo y de acuerdo comercial, no de cobro. El registro de un pedido no acredita pago alguno, y el estado «Confirmado» significa que el operador dio por firme la venta, no que el dinero haya ingresado.', { spacing: { before: 160, after: 160 } }),

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
        bullet('Bitácora funcional con autor, fecha, operación y cambios realizados por cada cuenta. La conservación de la identidad de una cuenta retirada no sustituye esta función.'),
        bullet('Consulta paginada de todo el historial de pedidos, más allá del límite de 200 registros de la vista actual.'),
        p('Como tareas de verificación y operación quedan la conciliación entre stock agregado y alertas de variantes, la definición del procedimiento de respaldo y su prueba de restauración, y la preparación de manuales. Estas tareas no se presentan como funcionalidades ya implementadas.'),
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
        bullet('La tienda pública permite alternar entre español y portugués. Los mensajes comerciales siguen el idioma elegido; el panel administrativo está en español.'),

        h3('3.1.2 Interfaces de Hardware'),
        p('Requisitos mínimos del equipo cliente:'),
        tabla(
          ['Componente', 'Mínimo', 'Recomendado'],
          [
            ['Procesador', 'x64 o ARM compatible con el navegador', 'Adecuado para el navegador y el catálogo'],
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
            ['Sistema operativo del cliente', 'Windows 10 o superior, macOS 12 o superior, distribución Linux con soporte vigente, Android 10 o superior, iOS 16.4 o superior.'],
            ['Navegador web', 'Objetivos de compatibilidad: Chrome 111+, Edge 111+, Firefox 128+ y Safari 16.4+, con JavaScript habilitado. Las pruebas ejecutadas se indican en el Apéndice C.'],
            ['Entorno de ejecución del servidor', 'Node.js versión 24.19.0, fijada en el repositorio para garantizar reproducibilidad.'],
            ['Motor de base de datos', 'PostgreSQL 15 o superior, con la extensión pgcrypto habilitada.'],
            ['Servicio de autenticación', 'Supabase Auth mediante HTTPS; administra las identidades y la verificación de contraseñas. La aplicación no consulta hashes directamente.'],
            ['Interfaz de mensajería', 'api.whatsapp.com/send, con el mensaje codificado mediante encodeURIComponent. Se utilizan caracteres Unicode y emojis, cuya representación depende del cliente receptor.'],
          ],
          [2600, 6426],
        ),

        h3('3.1.4 Interfaces de Comunicación'),
        bullet('Protocolo TCP/IP como capa base de red para la comunicación cliente-servidor.'),
        bullet('HTTPS sobre el puerto 443 para la totalidad del tráfico web. No se admite tráfico sin cifrar.'),
        bullet('La aplicación accede a Supabase Auth y a las APIs de datos mediante HTTPS; no abre una conexión directa al puerto PostgreSQL 5432 durante el uso normal.'),
        bullet('Las consultas y funciones de base de datos se invocan mediante la API REST/RPC de Supabase sobre HTTPS, con las credenciales y políticas correspondientes a cada operación.'),
        bullet('Cabeceras de seguridad aplicadas a todas las respuestas: X-Content-Type-Options, Referrer-Policy y X-Frame-Options. Las rutas del panel incorporan además directivas de no indexación y de no almacenamiento en caché.'),

        // ────────────────────────── 3.2 REQUISITOS FUNCIONALES
        h2('3.2 Requisitos Funcionales'),
        p('Cada requisito se presenta en una ficha con su sintaxis formal, sus condiciones de entrada y de salida y la referencia a las figuras donde aparece representado. Los requisitos cuyo comportamiento no se agota en el enunciado llevan además su propia lámina de vistas: quién ejecuta la función, cómo responde el sistema paso a paso y, cuando aporta algo que el texto no dice, de qué componentes se sirve. No todas las funciones necesitan las tres vistas; la autenticación, por ejemplo, no se explica mejor enumerando sus componentes.'),
        p('Se especifican a continuación los veintiún requisitos funcionales del sistema, redactados conforme a la sintaxis normalizada de ISO/IEC/IEEE 29148, con sus condiciones de entrada y sus efectos sobre los datos. Los criterios de aceptación describen las comprobaciones requeridas; el estado y la fecha de las pruebas realizadas se detallan en el Apéndice C.'),
        ...RF.flatMap(requisito),
        new Paragraph({ children: [new PageBreak()] }),

        // ────────────────────────── 3.3 RENDIMIENTO
        h2('3.3 Requisitos de Rendimiento'),
        p('Los siguientes valores son objetivos cuantitativos de calidad. Salvo la medición histórica de volumen indicada en RP06, no se dispone de mediciones actuales que acrediten su cumplimiento; deben comprobarse en un entorno y una carga definidos. La compilación correcta no demuestra por sí sola tiempos de respuesta, concurrencia o disponibilidad.'),
        tabla(
          ['Identificador', 'Requisito de Rendimiento', 'Métrica Objetivo'],
          [
            ['RP01', 'Tiempo de respuesta de una consulta de catálogo bajo carga habitual.', 'Inferior a 1.5 segundos.'],
            ['RP02', 'Tiempo de respuesta del filtrado y la búsqueda en el catálogo.', 'Inferior a 300 milisegundos, sin viaje al servidor.'],
            ['RP03', 'Tiempo de verificación de credenciales de acceso.', 'Inferior a 2 segundos.'],
            ['RP04', 'Tiempo de registro de un pedido completo, incluyendo descuento de existencias.', 'Inferior a 3 segundos.'],
            ['RP05', 'Conexiones concurrentes soportadas sin degradación apreciable.', 'Hasta 60 conexiones simultáneas al motor de base de datos.'],
            ['RP06', 'Volumen de código de cliente transferido al navegador.', 'No superior a 650 kB comprimidos. Antecedente del 14/09/2026: 629,5 kB; pendiente de nueva medición.'],
            ['RP07', 'Latencia de propagación de un cambio del panel a la tienda pública.', 'Hasta 60 segundos, por regeneración estática incremental.'],
          ],
          [1500, 4526, 3000],
        ),

        h2('3.4 Restricciones de Diseño'),
        bullet('El modelo relacional cumple las formas normales primera, segunda y tercera. Los datos de ficha técnica y compatibilidad se almacenan en columnas de tipo JSON estructurado por tratarse de atributos heterogéneos entre categorías, decisión documentada en el registro de decisiones del proyecto.'),
        bullet('Se emplean sentencias SQL estándar y funciones declaradas en el propio motor, de modo que la lógica crítica de negocio resida junto a los datos que valida.'),
        bullet('El dólar estadounidense constituye la moneda base de los precios. Los importes derivados se calculan mediante las tasas configuradas; el pedido conserva los importes y la tasa utilizados al registrarse para mantener su valor histórico.'),
        bullet('La disponibilidad se calcula a partir de las unidades. El listado de productos con variantes utiliza su suma, mientras que las alertas utilizan products.units; la conciliación entre ambas fuentes se señala como limitación de RF13.'),
        bullet('Los importes y la tasa de cambio se copian al pedido en el momento de su registro, de modo que un pedido histórico preserve las condiciones bajo las que se pactó.'),
        bullet('La clave de servicio permanece en el servidor y no se transmite al navegador. Se utiliza para el aprovisionamiento y para operaciones autorizadas de gestión de cuentas, previa comprobación de la sesión y del rol de moderador. El catálogo y el checkout públicos no utilizan esa clave.'),

        h2('3.5 Atributos del Sistema (Requisitos No Funcionales)'),
        p('Se establecen quince atributos de calidad. La columna de verificación indica objetivos, criterios de prueba o evidencia fechada; no supone que todos los objetivos hayan sido medidos ni que todos los procedimientos operativos estén configurados.'),
        tabla(
          ['ID', 'Atributo de Calidad', 'Requisito Detallado', 'Métrica de Verificación', 'Prioridad'],
          [
            ['RNF01', 'Seguridad informática', 'Supabase Auth administra las credenciales. Las tablas de aplicación aplican políticas de seguridad por fila; la clave de servicio solo se usa en operaciones administrativas autorizadas del servidor.', 'RLS declarada en las 9 tablas públicas del modelo. Criterio: una consulta anónima no obtiene cupones, pedidos ni cuentas administrativas. Esta política no impide probar códigos de cupón individuales.', 'Alta (Mandatorio)'],
            ['RNF02', 'Control de acceso', 'El acceso al panel exige sesión válida y pertenencia vigente al registro de administradores.', 'Criterio: toda ruta administrativa sin sesión redirige al acceso y una cuenta retirada no accede al panel. El alcance de las pruebas se detalla en el Apéndice C.', 'Alta'],
            ['RNF03', 'Rendimiento', 'Las páginas públicas emplean generación estática y regeneración. Se mantienen los objetivos RP01 a RP07.', 'Build del 11/10/2026: 100 páginas, con avisos de conexión y uso de datos de respaldo. Presupuesto: 650 kB; medición histórica del 14/09/2026: 629,5 kB. Tiempos y carga pendientes de medición.', 'Alta'],
            ['RNF04', 'Integridad de datos', 'Los importes del pedido se recalculan en el servidor y el stock se descuenta en la misma transacción.', 'El cliente transmite identificadores y cantidades, nunca importes. Prueba: un pedido que excede las existencias se revierte por completo.', 'Alta (Mandatorio)'],
            ['RNF05', 'Accesibilidad', 'Objetivo: conformidad con WCAG 2.1, nivel AA, en los recorridos públicos y administrativos.', 'Antecedente automatizado: axe-core sin infracciones en las rutas documentadas. No sustituye una evaluación manual ni acredita por sí solo conformidad completa. Ver Apéndice C.', 'Alta'],
            ['RNF06', 'Internacionalización', 'La interfaz pública y los mensajes comerciales están disponibles en español y portugués. El panel administrativo está en español.', 'Diccionarios tipados que detectan claves de traducción ausentes al compilar. Verificación funcional del cambio de idioma y de los mensajes; no se exige bilingüismo del panel.', 'Alta'],
            ['RNF07', 'Usabilidad', 'Objetivo táctil mínimo de 44 píxeles, respeto de la preferencia de movimiento reducido y mensajes de error explícitos.', 'Criterios: navegación por teclado, gestión del foco en diálogos y contenido accesible con movimiento reducido. Verificar los recorridos de uso, además de las comprobaciones automatizadas.', 'Alta'],
            ['RNF08', 'Compatibilidad', 'Objetivo: funcionamiento correcto en navegadores de escritorio y móviles compatibles.', 'Antecedente de pruebas en dos perfiles, escritorio y móvil. Se requiere comprobar los recorridos en el entorno de publicación; no se reejecutaron E2E el 11/10/2026.', 'Media-Alta'],
            ['RNF09', 'Tolerancia a fallos', 'Un fallo técnico del registro puede permitir continuar por WhatsApp sin persistencia interna. La falta de existencias bloquea el pedido; los datos obligatorios deben ser válidos.', 'Criterio: diferenciar rechazo por stock, error de formulario y fallo técnico. En el último caso, el mensaje se compone con los datos disponibles y queda sujeto a confirmación comercial.', 'Alta'],
            ['RNF10', 'Trazabilidad', 'El checkout que se registra correctamente conserva número, estado, líneas, importes y tasa antes de abrir WhatsApp. Se excluyen la compra directa y la continuación sin registro.', 'Numeración por secuencia de base de datos. El registro persiste aunque no se envíe el mensaje, salvo posterior baja autorizada. No implica una bitácora de todas las acciones administrativas.', 'Alta'],
            ['RNF11', 'Disponibilidad', 'Objetivo: continuidad del servicio durante el horario comercial.', '99,9 % de lunes a sábado, de 08:00 a 20:00. Pendiente de medición mediante monitoreo durante un período definido; no se acredita con una comprobación puntual del sitio.', 'Alta'],
            ['RNF12', 'Fiabilidad y respaldo', 'Objetivo: una copia de seguridad diaria y capacidad de restaurar la información ante fallos.', 'Plan actual: Free. No se acredita un servicio de respaldo diario administrado. Deben definirse el responsable, el procedimiento y el almacenamiento, y conservar evidencia de ejecución y de una prueba de restauración.', 'Alta'],
            ['RNF13', 'Mantenibilidad', 'Verificación automatizada del código y documentación de decisiones estructurales.', '11/10/2026: 136 pruebas unitarias, tipos y análisis estático correctos. Las 97 E2E son evidencia histórica del 14/09/2026 y no fueron reejecutadas. Decisiones documentadas en docs/adr/.', 'Media-Alta'],
            ['RNF14', 'Privacidad', 'Se solicitan los datos necesarios para coordinar la entrega.', 'Los formularios no exigen documento de identidad, fecha de nacimiento ni datos de pago, y no tienen campos específicos para ellos. Los campos libres se destinan a observaciones del pedido.', 'Alta'],
            ['RNF15', 'Separación de funciones', 'La gestión de cuentas y la baja de pedidos se reservan al moderador. La autorización se comprueba en el servidor y, donde corresponde, en las políticas de base de datos.', 'Criterio: un administrador no puede crear cuentas, restablecer claves ajenas, retirar accesos ni dar de baja pedidos, incluso invocando directamente las operaciones. Verificación histórica diferenciada en el Apéndice C.', 'Alta'],
          ],
          [900, 1700, 2400, 2626, 1400],
        ),

        h2('3.6 Otros Requisitos'),
        bullet('Protección de datos personales: se recolectan nombre, apellido, teléfono y, cuando corresponde, dirección para coordinar el pedido. Los datos registrados se almacenan en Supabase y el mensaje puede transmitirse mediante WhatsApp. El sistema no incorpora funciones de publicidad ni de venta de datos personales.'),
        bullet('Veracidad de la información comercial: los importes en guaraníes y reales se rotulan expresamente como referenciales y derivados de una tasa fija, sin constituir cotización en firme.'),
        bullet('Origen del material gráfico: las fotografías de producto proceden de material de prensa de los fabricantes. Su procedencia se documenta individualmente en el archivo public/products/SOURCES.md, con la página oficial y el archivo de origen de cada imagen.'),
        bullet('Ausencia de tratamiento de datos de pago: el sistema no solicita, transmite ni almacena datos de tarjeta o credenciales bancarias. La especificación no constituye una certificación de cumplimiento de estándares de pago.'),
        new Paragraph({ children: [new PageBreak()] }),

        h2('3.7 Modelado UML del Sistema'),
        p('Los cuatro diagramas siguientes presentan las vistas generales del sistema en notación UML 2.5: casos de uso, componentes, comportamiento y clases. Complementan las láminas de los veintiún requisitos funcionales. Cada caso de uso identifica su requisito para facilitar el contraste entre el texto y la representación gráfica.'),

        p('El cliente opera sin cuenta. El administrador se autentica, cambia su clave y gestiona RF12 a RF16. El moderador hereda esas funciones y añade RF17, RF18, RF20 y RF21. La Figura 24 se presenta en dos vistas para conservar la legibilidad: tienda pública y panel.'),
        ...figura('casos-de-uso-publico.png', 640, 'Figura 24a — Casos de uso de la tienda pública y relación con WhatsApp.'),
        ...figura('casos-de-uso-panel.png', 640, 'Figura 24b — Casos de uso del panel. El moderador hereda los permisos del administrador.', true),
        new Paragraph({ children: [new PageBreak()] }),

        p('El diagrama de componentes distingue navegador, servidor Next.js, Supabase y WhatsApp. El navegador presenta el catálogo, mantiene el carrito y redacta el mensaje. El servidor procesa las acciones administrativas y verifica sus permisos; la clave de servicio utilizada para la gestión autorizada de cuentas permanece en ese entorno. Supabase Auth valida las credenciales, mientras que las funciones transaccionales de PostgreSQL releen precios y actualizan existencias. Las llamadas a los servicios se realizan mediante HTTPS.'),
        ...figura('componentes.png', 640, 'Figura 25 — Diagrama de componentes. Nodos de ejecución y dependencias entre partes.'),
        new Paragraph({ children: [new PageBreak()] }),

        p('El diagrama de comportamiento representa tres resultados del checkout. Si el registro tiene éxito, el mensaje utiliza los importes persistidos. Si faltan existencias, la operación termina sin abrir WhatsApp. Ante un fallo técnico que permita continuar sin registro, el navegador compone el mensaje con los datos disponibles y la confirmación comercial queda a cargo del vendedor. El registro previo conserva la consulta aunque no se envíe el mensaje, únicamente en el camino que logró persistir el pedido.'),
        ...figura('comportamiento.png', 640, 'Figura 26 — Secuencia del checkout: cupón opcional y alternativas de registro, falta de existencias y fallo técnico.'),
        new Paragraph({ children: [new PageBreak()] }),

        p('El diagrama de clases resume las entidades persistentes y sus multiplicidades. Cada línea pertenece a un pedido y se elimina con él; su referencia al producto o a la variante puede quedar nula, preservando el nombre y el precio históricos. Un pedido admite como máximo un código de cupón, conservado sin clave foránea, y una zona de entrega opcional. Una identidad de autenticación puede tener cero o una fila de pertenencia al panel; cada fila de admin_users corresponde a una identidad. El Apéndice A resume tablas, claves y funciones, sin sustituir el esquema completo de las migraciones.'),
        ...figura('clases.png', 640, 'Figura 27 — Clases persistentes y relaciones principales. El Apéndice A resume las tablas y claves.'),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════ 4 APÉNDICES
        h1('4. Apéndices'),
        h2('4.1 Apéndice A — Resumen del modelo de datos'),
        p('Se resumen las nueve tablas públicas de la aplicación, su finalidad, claves y restricciones principales. Las identidades de Supabase Auth pertenecen a un esquema separado. La Figura 27 muestra las relaciones y multiplicidades; la definición completa de columnas, políticas y funciones se conserva en las migraciones SQL del proyecto.'),
        tabla(
          ['Tabla', 'Finalidad', 'Claves y restricciones principales'],
          [
            ['categories', 'Categorías del catálogo, con su denominación bilingüe y orden de presentación.', 'PK: slug'],
            ['products', 'Productos, con precio en dólares, existencias, ficha técnica y datos de compatibilidad.', 'PK: id · UNIQUE: slug, ref · FK: category_slug'],
            ['product_variants', 'Variantes de un producto, con SKU, ejes, precio y existencias propias.', 'PK: id · UNIQUE: sku · FK: product_id'],
            ['shipping_zones', 'Destinos de entrega. No llevan tarifa: el envío se acuerda por la vía de mensajería.', 'PK: id · UNIQUE: slug'],
            ['coupons', 'Cupones de descuento, con vigencia, compra mínima y límite de usos.', 'PK: id · UNIQUE: código en mayúsculas · CHECK: porcentaje ≤ 100'],
            ['orders', 'Pedidos registrados, con estado, importes y tasa históricos; conserva un código de cupón opcional sin FK.', 'PK: id · UNIQUE: number (secuencia) · FK opcional: zone_slug'],
            ['order_items', 'Líneas de pedido, con nombre, SKU y precio históricos. Producto y variante pueden quedar nulos.', 'PK: id · FK: order_id · FK opcionales: product_id, variant_id · CHECK: qty > 0'],
            ['settings', 'Configuración por clave: tasa de cambio, umbrales comerciales y contacto.', 'PK: key'],
            ['admin_users', 'Pertenencia al panel y estado de acceso. revoked_at permite retirar y restituir acceso conservando la identidad; no registra una bitácora de operaciones.', 'PK / FK a auth.users: user_id · UNIQUE: username'],
          ],
          [1900, 3626, 3500],
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),
        p('Funciones almacenadas:'),
        tabla(
          ['Función', 'Tipo', 'Finalidad'],
          [
            ['is_admin()', 'STABLE, SECURITY DEFINER', 'Determina la pertenencia vigente al panel. Las políticas que la utilizan impiden escrituras administrativas a una cuenta retirada aunque conserve su sesión.'],
            ['is_moderator()', 'STABLE, SECURITY DEFINER', 'Añade a lo anterior la exigencia del rol de moderación, leído de los metadatos reservados al servidor. Gobierna la baja de pedidos a nivel de fila.'],
            ['validate_coupon(código, subtotal)', 'STABLE, SECURITY DEFINER', 'Valida un cupón y devuelve el descuento ya calculado, sin exponer el listado de cupones.'],
            ['place_order(líneas, cliente, zona, cupón)', 'VOLATILE, SECURITY DEFINER', 'Registra el pedido de forma atómica: relee precios, aplica cupón, descuenta existencias y persiste pedido y líneas.'],
            ['delete_order(pedido)', 'VOLATILE, SECURITY DEFINER', 'Suprime un pedido devolviendo sus unidades al inventario en la misma transacción, salvo que conste como entregado. Exige el rol de moderación.'],
            ['touch_updated_at()', 'TRIGGER', 'Actualiza la marca temporal de modificación en cada escritura.'],
          ],
          [2600, 2200, 4226],
        ),

        h2('4.2 Apéndice B — Formatos de salida'),
        p('El sistema genera dos formatos de mensaje en español o portugués. Codifica su contenido mediante encodeURIComponent y presenta importes convertidos a guaraníes desde precios base en dólares. La moneda y las condiciones del pago efectivo se acuerdan por WhatsApp, fuera de la aplicación.'),
        p('Formato 1 — Compra directa desde la ficha de producto', { run: { bold: true } }),
        p('Incluye encabezado de saludo, denominación del producto y su variante si corresponde, código de referencia, cantidad, precio unitario, enlace a la ficha, total y solicitud de confirmación de disponibilidad.'),
        p('Codificación y presentación', { run: { bold: true } }),
        p('Los mensajes utilizan texto Unicode, marcado de énfasis y emojis, transmitidos mediante api.whatsapp.com/send. No existe una restricción al Plano Multilingüe Básico. Las pruebas verifican la composición del texto y su codificación; la apariencia final depende del dispositivo y del cliente de WhatsApp receptor.'),
        p('Formato 2 — Pedido completo desde el checkout', { run: { bold: true } }),
        p('Incluye encabezado y, si hubo registro, número de pedido; una línea por pieza sin numeración ordinal, código, cantidad y subtotal; descuento cuando corresponde; zona de entrega, total de piezas y datos del cliente. El envío se acuerda en la conversación. Las líneas que no aplican se omiten. Si el registro tuvo éxito, se utilizan sus importes persistidos; ante continuación por fallo técnico se emplean los datos disponibles, sin atribuirles un número de pedido inexistente.'),

        h2('4.3 Apéndice C — Resultados de verificación'),
        p('La revisión documental final corresponde al 12/10/2026. Las últimas comprobaciones locales de código se realizaron el 11/10/2026; no se ejecutaron nuevas pruebas de software como parte de esta edición del SRS. Se distinguen esos resultados de los antecedentes del 14/09/2026 y de las verificaciones todavía pendientes.'),
        tabla(
          ['Verificación y fecha', 'Alcance / Entorno', 'Resultado o estado'],
          [
            ['Tipos — 11/10/2026', 'Código local en modo estricto.', 'Sin errores.'],
            ['Análisis estático — 11/10/2026', 'Código local.', 'Sin errores ni advertencias de lint.'],
            ['Pruebas unitarias — 11/10/2026', '136 casos sobre dominio y módulos del proyecto.', '136 correctas.'],
            ['Compilación — 11/10/2026', 'Build local previo a la restauración de Supabase; utilizó datos de respaldo ante avisos de conexión.', '100 páginas generadas; no equivale a una prueba de integración.'],
            ['E2E — antecedente 14/09/2026', '97 casos en perfiles de escritorio y móvil, según el registro de desarrollo.', '97 correctas entonces; no reejecutadas en esta revisión.'],
            ['Cuentas y roles — antecedente de desarrollo', 'Alta, restablecimiento, retiro de acceso y baja de pedidos con cuentas de prueba.', 'Resultados históricos; sin nueva prueba autenticada el 11/10/2026.'],
            ['Accesibilidad — antecedente 14/09/2026', 'axe-core en 10 rutas públicas en ambos idiomas y 8 pantallas administrativas.', '0 infracciones automáticas registradas; evaluación manual completa pendiente.'],
            ['Errores del cliente — antecedente 14/09/2026', 'Barrido de rutas: consola, excepciones, peticiones e imágenes.', '0 incidencias registradas entonces; sin nuevo barrido E2E.'],
            ['Volumen de código — 14/09/2026', 'Medición histórica de JavaScript comprimido; presupuesto de 650 kB.', '629,5 kB; nueva medición pendiente.'],
            ['Disponibilidad puntual — 11/10/2026', 'Supabase restaurado; web pública HTTP 200 y panel redirigiendo al acceso.', 'Servicio reactivado; no acredita operaciones autenticadas, integración ni 99,9 % de disponibilidad.'],
            ['Metas y procedimientos pendientes', 'Tiempos, concurrencia, propagación, disponibilidad, restauración de respaldos y conciliación de stock de variantes.', 'Requieren pruebas y evidencia específicas.'],
          ],
          [2600, 4426, 2000],
        ),
        p('Esta especificación describe la copia local del proyecto. Al comprobar el entorno el 11/10/2026, la publicación de producción correspondía al commit b3a5a92 del 09/09/2026 y conservaba contenido estático anterior; las mejoras locales posteriores no se habían desplegado. La restauración de Supabase no publica esos cambios ni sustituye una verificación del recorrido completo.', { spacing: { before: 180, after: 120, line: 276 } }),

        h2('4.4 Apéndice D — Glosario de negocio'),
        tabla(
          ['Término de negocio', 'Significado en el contexto de Sky Import'],
          [
            ['Últimas unidades', 'Estado derivado que se aplica a un producto cuyas existencias son iguales o inferiores al umbral configurado.'],
            ['Envío a coordinar', 'Régimen único de entrega del sistema. Ninguna pantalla exhibe un importe de flete; el importe que se muestra corresponde exclusivamente a las piezas y así queda rotulado.'],
            ['Precio de vitrina', 'Importe redondeado que se publica: al millar en guaraníes y al décimo en reales.'],
            ['Iniciado por WhatsApp', 'Estado inicial de un pedido registrado desde el checkout. El registro se crea antes de abrir WhatsApp y no demuestra que el cliente haya enviado el mensaje ni que exista una venta o pago confirmado.'],
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

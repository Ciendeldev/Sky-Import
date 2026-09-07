import type { Locale } from './locales'

/**
 * DICCIONARIO
 *
 * El español es la fuente de verdad. `pt` está tipado como `Record<DictKey, string>`,
 * así que el compilador exige que exista TODA clave en portugués: ningún texto de
 * la interfaz puede quedar en un solo idioma sin que falle `tsc`.
 */

const es = {
  // ─────────────────────────────────────────────────────────────── estructura
  'skip.toContent': 'Saltar al contenido',
  'brand.role': 'Componentes para PC',
  'brand.place': 'Ciudad del Este · Paraguay',

  'nav.catalog': 'Catálogo',
  'nav.build': 'Arma tu PC',
  'nav.guides': 'Guías',
  'nav.cart': 'Carrito',
  'nav.openMenu': 'Abrir menú',
  'nav.closeMenu': 'Cerrar menú',
  'nav.openCart': 'Abrir carrito',
  'nav.closeCart': 'Cerrar carrito',
  'nav.menu': 'Menú',

  'lang.label': 'Idioma',
  'currency.label': 'Moneda',
  'currency.reference': 'referencial',
  'currency.note':
    'Guaraníes y reales son una conversión referencial a tasa fija; la operación se cierra en dólares.',

  // ────────────────────────────────────────────────────────────────── acciones
  'cta.catalog': 'Ver catálogo',
  'cta.build': 'Arma tu PC',
  'cta.add': 'Agregar al carrito',
  'cta.added': 'Agregado',
  'cta.view': 'Ver',
  'cta.viewAll': 'Ver todo el catálogo',
  'cta.whatsapp': 'Consultar por WhatsApp',
  'cta.buyWhatsapp': 'Comprar por WhatsApp',
  'cta.backToStore': 'Volver a la tienda',
  'cta.reviewCart': 'Revisar el carrito',
  'cta.close': 'Cerrar',
  'cta.undo': 'Deshacer',

  // ────────────────────────────────────────────────────────────────────── home
  'home.hero.eyebrow': 'Ciudad del Este · Paraguay',
  'home.hero.title1': 'Cada pieza',
  'home.hero.title2': 'con su ficha',
  'home.hero.title3': 'delante.',
  'home.hero.lede':
    'Importamos componentes para armar, mejorar y personalizar computadoras. Publicamos zócalo, vataje y milímetros antes que el precio, para que sepas si la pieza entra antes de preguntar cuánto cuesta.',
  'home.hero.figureAlt':
    'Render técnico de una tarjeta gráfica de tres ventiladores con sus cotas de longitud y altura anotadas.',

  'home.manifest.pieces': 'Piezas en catálogo',
  'home.manifest.categories': 'Categorías',
  'home.manifest.currencies': 'Monedas',
  'home.manifest.check': 'Compatibilidad',
  'home.manifest.checkValue': 'Verificada',

  'home.categories.eyebrow': 'Índice',
  'home.categories.title': 'Qué decide cada pieza',
  'home.categories.lede':
    'Un armado se rompe siempre en el mismo sitio: una pieza que no entra en otra. Éste es el orden en que conviene decidir.',
  'home.categories.count': 'piezas',

  'home.featured.eyebrow': 'Selección',
  'home.featured.title': 'Lo que estamos moviendo',
  'home.featured.lede':
    'Las piezas con más salida del mes, con su ficha completa y su código de referencia.',

  'home.builder.eyebrow': 'Herramienta',
  'home.builder.title': 'Arma tu PC y verificá que todo entre',
  'home.builder.lede':
    'Elegí procesador, placa, memoria, video, fuente, refrigeración y gabinete. El configurador compara zócalos, generación de memoria, vataje y milímetros, y te avisa en castellano llano qué no encaja.',
  'home.builder.cta': 'Abrir el configurador',

  'home.guides.eyebrow': 'Cómo se elige',
  'home.guides.title': 'Cuatro decisiones que definen el armado',
  'home.guides.lede':
    'No es una lista de recomendaciones. Es el orden real en que una pieza condiciona a la siguiente.',

  'home.how.eyebrow': 'Cómo comprar',
  'home.how.title': 'Tres pasos y listo',
  'home.how1.title': 'Elegís las piezas',
  'home.how1.body':
    'Cada ficha trae zócalo, vataje y milímetros. El configurador avisa si algo no encaja antes de que lo agregues, no después.',
  'home.how2.title': 'Enviás el pedido por WhatsApp',
  'home.how2.body':
    'El mensaje se arma solo con lo que elegiste y tus datos de entrega. No se piden datos de tarjeta en ninguna pantalla.',
  'home.how3.title': 'Cerramos por chat',
  'home.how3.body':
    'Confirmamos disponibilidad, acordamos el envío según a dónde va y coordinamos el pago y la entrega. Recién ahí pagás.',
  'home.benefits.eyebrow': 'Cómo trabajamos',
  'home.benefits.title': 'Lo que sí podemos afirmar',
  'home.benefit1.title': 'Ficha técnica completa en cada pieza',
  'home.benefit1.body':
    'Zócalo, generación de memoria, consumo, fuente recomendada y longitud en milímetros. Verificados contra la ficha del fabricante antes de publicarlos.',
  'home.benefit2.title': 'Compatibilidad comprobable antes de comprar',
  'home.benefit2.body':
    'El configurador compara las piezas entre sí y explica el problema en lenguaje llano. Son comprobaciones fundamentales, no una validación exhaustiva.',
  'home.benefit3.title': 'Precio en tres monedas y atención en dos idiomas',
  'home.benefit3.body':
    'Dólar como referencia de la operación, guaraní y real convertidos a tasa fija para comparar del otro lado de la frontera. Español y portugués.',
  'home.benefit4.title': 'La consulta se cierra por WhatsApp',
  'home.benefit4.body':
    'El carrito arma el mensaje con los modelos, las cantidades y los totales. No hay formularios ni cuentas que crear.',


  // ───────────────────────────────────────────────────────────── ensamblaje
  "assembly.eyebrow": "Ingeniería, capa por capa",
  "assembly.description": "Por fuera, una sola pieza. Por dentro, un sistema completo. Explorá la RTX 5090 Founders Edition: dos ventiladores, cámara de vapor y 32 GB de GDDR7 alrededor del chip Blackwell.",
  "assembly.memory": "Memoria",
  "assembly.bus": "Bus de memoria",
  "assembly.cores": "Núcleos CUDA",
  "assembly.power": "Potencia gráfica",
  "assembly.dimensions": "Dimensiones",
  "assembly.inquiry": "¡Hola, equipo de *Sky Import*! 👋\n\nEstuve explorando la *GeForce RTX 5090* en la web. 🖥️\n¿Me cuentan qué modelos pueden conseguir, su precio y disponibilidad?\n\n¡Gracias! 🙌",
  "assembly.consult": "Consultar por la RTX 5090",
  "assembly.catalog": "Ver gráficas del catálogo",
  "assembly.select": "Identificar una pieza de la RTX 5090",
  "assembly.all": "Explorar piezas",
  "assembly.static": "Vista de la gráfica",
  "assembly.alt": "Recreación de una RTX 5090 Founders Edition con dos ventiladores y carcasa metálica",
  'assembly.cta': 'Ver la ficha completa',
  "assembly.note": "Recreación 3D ilustrativa de la Founders Edition. Diseño interno aproximado. Precio, modelo disponible y stock se confirman por WhatsApp.",
  'assembly.hint': 'Desplazá para desarmarla y volver a montarla',
  'assembly.closed': 'Montada',
  'assembly.open': 'Despiece',

  // ─────────────────────────────────────────────────────────────────── catálogo
  'catalog.title': 'Catálogo',
  'catalog.eyebrow': 'Manifiesto de piezas',
  'catalog.lede':
    'Todo el inventario, con su ficha y su código. Filtrá por lo que de verdad decide: categoría, marca, precio y disponibilidad.',
  'catalog.search': 'Buscar por modelo, marca o código',
  'catalog.searchLabel': 'Buscar en el catálogo',
  'catalog.results': 'piezas',
  'catalog.result': 'pieza',
  'catalog.filters': 'Filtros',
  'catalog.openFilters': 'Filtrar y ordenar',
  'catalog.applyFilters': 'Ver resultados',
  'catalog.reset': 'Restablecer filtros',
  'catalog.category': 'Categoría',
  'catalog.brand': 'Marca',
  'catalog.price': 'Precio máximo',
  'catalog.availability': 'Disponibilidad',
  'catalog.onlyAvailable': 'Solo lo que está en depósito',
  'catalog.sort': 'Ordenar',
  'catalog.sort.relevance': 'Sugerido',
  'catalog.sort.priceAsc': 'Precio: de menor a mayor',
  'catalog.sort.priceDesc': 'Precio: de mayor a menor',
  'catalog.sort.name': 'Nombre A–Z',
  'catalog.empty.title': 'Ninguna pieza coincide',
  'catalog.empty.body':
    'Probá con menos filtros, o buscá por el código de referencia si lo tenés a mano.',
  'catalog.all': 'Todas',
  'catalog.activeFilters': 'Filtros activos',

  // ────────────────────────────────────────────────────────────────── producto
  'product.ref': 'Referencia',
  'product.specs': 'Ficha técnica',
  'product.compat': 'Qué condiciona esta pieza',
  'product.related': 'De la misma categoría',
  'product.qty': 'Cantidad',
  'product.decrease': 'Quitar una unidad',
  'product.increase': 'Sumar una unidad',
  'product.gallery.front': 'Vista frontal',
  'product.gallery.annotated': 'Vista con cotas',
  'product.gallery.hint': 'Pasá el puntero para ver las cotas',
  'product.priceNote':
    'Precio y disponibilidad son datos de esta tienda, no información oficial del fabricante.',
  'product.specsNote':
    'Especificaciones verificadas contra la ficha del fabricante. Los datos comerciales son nuestros.',
  'product.availability.disponible': 'En depósito',
  'product.availability.ultimas-unidades': 'Últimas unidades',
  'product.availability.agotado': 'Sin stock',
  'product.units': 'unidades',
  'product.unit': 'unidad',
  'product.tag.new': 'Llegada reciente',
  'product.tag.off': 'menos',
  'product.was': 'antes',
  'product.notFound': 'Esa pieza no está en el catálogo',
  'product.notFoundBody': 'Puede que haya cambiado de código. Buscala en el catálogo completo.',
  'product.addedToCart': 'agregado al carrito',
  'product.soldOut': 'Sin stock — consultá por WhatsApp',
  'product.soldOutNote':
    'Esta pieza no tiene unidades ahora mismo. Escribinos y te avisamos apenas entre.',

  // ────────────────────────────────────────────────────────────── configurador
  'build.title': 'Arma tu PC',
  'build.eyebrow': 'Tablero de compatibilidad',
  'build.lede':
    'Elegí una pieza por ranura. A medida que elegís, el tablero compara zócalos, generación de memoria, vataje y milímetros.',
  'build.slot.cpu': 'Procesador',
  'build.slot.motherboard': 'Placa madre',
  'build.slot.ram': 'Memoria RAM',
  'build.slot.gpu': 'Tarjeta gráfica',
  'build.slot.storage': 'Almacenamiento',
  'build.slot.psu': 'Fuente',
  'build.slot.cooling': 'Refrigeración',
  'build.slot.case': 'Gabinete',
  'build.choose': 'Elegir',
  'build.change': 'Cambiar',
  'build.clearSlot': 'Quitar',
  'build.empty': 'Sin elegir',
  'build.status.vacio': 'Elegí la primera pieza',
  'build.status.ok': 'Todo lo comprobado encaja',
  'build.status.aviso': 'Hay algo que conviene revisar',
  'build.status.bloqueo': 'Hay piezas que no encajan',
  'build.issues': 'Advertencias',
  'build.noIssues': 'Sin advertencias por ahora.',
  'build.draw': 'Consumo estimado',
  'build.suggestedPsu': 'Fuente sugerida',
  'build.total': 'Total del armado',
  'build.addAll': 'Agregar el armado al carrito',
  'build.reset': 'Vaciar el armado',
  'build.scene.eyebrow': 'Montaje 3D en vivo',
  'build.scene.title': 'Mirá cómo cada pieza encuentra su lugar',
  'build.scene.idle': 'Chasis en espera',
  'build.scene.assembling': 'Montaje en curso',
  'build.scene.ready': 'Listo para probar',
  'build.scene.checking': 'Comprobando energía y compatibilidad',
  'build.scene.checkingShort': 'Comprobando',
  'build.scene.failed': 'No pudo encender',
  'build.scene.blocked': 'Encendido bloqueado',
  'build.scene.powered': 'Sistema encendido',
  'build.scene.power': 'Encender PC',
  'build.scene.powerOff': 'Apagar PC',
  'build.scene.retry': 'Probar de nuevo',
  'build.scene.hint': 'Elegí la siguiente pieza: entrará al gabinete y quedará montada delante tuyo.',
  'build.scene.powerHint': 'Las ocho piezas están montadas. Encendé la PC para comprobar energía y compatibilidad.',
  'build.scene.checkingHint': 'Revisando zócalo, memoria, espacio físico y capacidad de la fuente.',
  'build.scene.failedHint': 'Cambiá las piezas señaladas y volvé a probar el encendido.',
  'build.scene.readyHint': 'RGB activo, ventiladores girando y pulsos de energía recorriendo el cableado.',
  'build.scene.diagnostic': 'Diagnóstico de arranque',
  'build.scene.compatibleOptions': 'Ver opciones compatibles',
  'build.scene.purchase': 'Comprar armado',
  'build.scene.purchaseHint': 'Precio especial por conjunto',
  'build.scene.approx': 'Representación 3D aproximada; la foto real identifica el producto elegido.',
  'build.option.compatible': 'Compatible con tu armado',
  'build.option.conflict': 'Requiere otro cambio',
  'build.disclaimer':
    'Estas son comprobaciones fundamentales, no una validación exhaustiva de todas las combinaciones posibles. No verificamos perfiles de memoria validados por la placa, altura de los disipadores de la RAM ni versiones de BIOS.',
  'build.pickTitle': 'Elegir',
  'build.pickEmpty': 'No hay piezas de esta categoría en el catálogo.',
  'build.addedAll': 'Armado agregado al carrito',
  'build.level.bloqueo': 'No encaja',
  'build.level.aviso': 'Revisar',
  'build.level.nota': 'Nota',

  // ─────────────────────────────────────────────────────────────────── carrito
  'cart.title': 'Carrito',
  'cart.empty.title': 'El carrito está vacío',
  'cart.empty.body': 'Empezá por el catálogo, o armá el equipo completo en el configurador.',
  'cart.subtotal': 'Subtotal',
  'cart.shipping': 'Envío',
  /**
   * El envío NO tiene importe en ninguna pantalla. Depende del peso y del
   * destino, y la tienda no puede saberlo antes de ver el pedido: se cierra
   * en la misma conversación de WhatsApp donde se cierra la venta.
   */
  'cart.shipping.toArrange': 'Se acuerda por WhatsApp',
  /** Retiro por el local: no hay flete, así que no hay nada que acordar. */
  'cart.shipping.pickup': 'Retirás en el local',
  'cart.shipping.note':
    'El costo del flete depende del peso y del destino. Lo cerramos con vos en la conversación, antes de que pagues nada.',
  'checkout.totalWithoutShipping': 'Total de las piezas',
  /**
   * El botón flotante no lleva texto: solo el globo de WhatsApp, que es la
   * marca más reconocible que existe y no necesita que la expliquen. La
   * etiqueta sigue existiendo para el lector de pantalla, que sí la necesita.
   */
  'wa.fabLabel': 'Escribinos por WhatsApp',
  /**
   * El mensaje que ya viene escrito.
   *
   * El patrón que usan las tiendas —y el motivo— es este: el vendedor recibe
   * decenas de «hola» sueltos al día y no sabe de dónde vienen. Un primer
   * mensaje que nombra la tienda le dice que ese contacto llegó de la web y no
   * de un cartel, y que ya vio los precios. Y para el cliente vale más que un
   * saludo vacío: le ahorra tener que explicar de entrada quién es.
   *
   * Corto a propósito. Un texto largo puesto en boca del cliente se lee falso,
   * y lo primero que hace es borrarlo.
   */
  'wa.fabMessage': '¡Hola, equipo de *Sky Import*! 👋\nEstuve mirando sus componentes y quiero darle un upgrade a mi PC. 💻\n¿Me ayudan a elegir las piezas?',
  'cart.total': 'Total',
  'cart.remove': 'Quitar',
  'cart.removed': 'quitado del carrito',
  'cart.clear': 'Vaciar el carrito',
  'cart.cleared': 'Carrito vaciado',
  'cart.checkout': 'Finalizar compra',
  'cart.continue': 'Seguir comprando',
  'cart.lines': 'artículos',
  'cart.line': 'artículo',
  'cart.loading': 'Cargando el carrito',

  // ────────────────────────────────────────────────────────────────── checkout
  'checkout.title': 'Finalizar compra',
  'checkout.lede':
    'Completá tus datos y enviamos el pedido armado por WhatsApp. Ahí confirmamos disponibilidad y coordinamos el pago y la entrega.',
  'checkout.orderSummary': 'Tu pedido',

  'checkout.section.contact': 'Tus datos',
  'checkout.firstName': 'Nombre',
  'checkout.lastName': 'Apellido',
  'checkout.phone': 'Teléfono de contacto',
  'checkout.phoneHint': 'Con el que te escribimos por WhatsApp.',

  'checkout.section.delivery': 'Entrega',
  'checkout.zone': 'Ciudad o zona',
  'checkout.address': 'Dirección exacta',
  'checkout.addressPlaceholder': 'Calle, número, barrio y una referencia',
  'checkout.notes': 'Notas del pedido',
  'checkout.notesPlaceholder': 'Horario en el que estás, referencias para llegar, lo que sea útil.',
  'checkout.notesOptional': 'Opcional',

  'checkout.section.coupon': 'Cupón de descuento',
  'checkout.couponLabel': 'Código del cupón',
  'checkout.couponPlaceholder': 'Código',
  'checkout.couponApply': 'Aplicar',
  'checkout.couponApplied': 'Cupón aplicado',
  'checkout.couponRemove': 'Quitar',
  'checkout.coupon.not_found': 'Ese código no existe.',
  'checkout.coupon.inactive': 'Ese cupón ya no está activo.',
  'checkout.coupon.expired': 'Ese cupón venció.',
  'checkout.coupon.not_started': 'Ese cupón todavía no empezó a regir.',
  'checkout.coupon.exhausted': 'Ese cupón ya llegó a su límite de usos.',
  'checkout.coupon.below_minimum': 'Tu pedido no llega al mínimo que pide ese cupón.',
  'checkout.coupon.offline': 'No pudimos comprobar el cupón. Probá de nuevo en un momento.',

  'checkout.send': 'Enviar pedido por WhatsApp',
  'checkout.sending': 'Preparando el pedido',
  'checkout.required': 'Completá nombre, apellido y teléfono para continuar.',
  'checkout.addressRequired': 'Para esta zona necesitamos la dirección exacta.',
  'checkout.failed': 'No pudimos registrar el pedido. Probá de nuevo o escribinos directamente.',
  'checkout.howItWorks':
    'El pedido se cierra por WhatsApp: no se piden datos de tarjeta en esta pantalla. Al enviarlo, se abre la conversación con todo el detalle ya escrito.',
  'checkout.emptyTitle': 'No hay nada para finalizar',
  'checkout.emptyBody': 'Agregá al menos una pieza al carrito para continuar.',

  // ────────────────────────────────────────────────────────────────────── guías
  'guides.title': 'Guías',
  'guides.eyebrow': 'Cómo se elige',
  'guides.lede':
    'Cuatro decisiones, en el orden en que una condiciona a la siguiente. Sin recomendaciones de modelo: criterios.',
  'guides.read': 'Leer',
  'guides.back': 'Volver a las guías',
  'guides.notFound': 'Esa guía no existe',

  // ───────────────────────────────────────────────────────────────────── varios
  'footer.rights': 'Todos los derechos reservados.',
  'footer.explore': 'Tienda',
  'footer.help': 'Cómo elegir',
  'footer.contact': 'Contacto',
  'footer.legal': 'Precios y disponibilidad',
  'footer.legalNote':
    'Los precios están expresados en dólares estadounidenses. Las conversiones a guaraníes y reales son referenciales, a tasa fija, y no constituyen una cotización. La disponibilidad puede cambiar sin aviso.',
  'footer.whatsapp': 'Escribinos',

  'notFound.title': 'Esta dirección no existe',
  'notFound.body': 'Puede que la pieza haya cambiado de código o que el enlace esté cortado.',
  'error.title': 'Algo se cortó de este lado',
  'error.body': 'Recargá la página. Si vuelve a pasar, escribinos y lo miramos.',
  'error.retry': 'Reintentar',

  'intro.skip': 'Omitir',
  'intro.label': 'Sky Import — animación de entrada',

  'wa.productMessage': '¡Hola, equipo de *Sky Import*! 👋 Quería consultar la disponibilidad de',
  'wa.cartIntro': 'Hola, quiero consultar por este pedido:',
  'wa.cartTotal': 'Total',
  'wa.generic': '¡Hola, equipo de *Sky Import*! 👋\nEstuve mirando sus componentes y quiero darle un upgrade a mi PC. 💻\n¿Me ayudan a elegir las piezas?',
} as const

export type DictKey = keyof typeof es

const pt: Record<DictKey, string> = {
  'skip.toContent': 'Pular para o conteúdo',
  'brand.role': 'Componentes para PC',
  'brand.place': 'Ciudad del Este · Paraguai',

  'nav.catalog': 'Catálogo',
  'nav.build': 'Monte seu PC',
  'nav.guides': 'Guias',
  'nav.cart': 'Carrinho',
  'nav.openMenu': 'Abrir menu',
  'nav.closeMenu': 'Fechar menu',
  'nav.openCart': 'Abrir carrinho',
  'nav.closeCart': 'Fechar carrinho',
  'nav.menu': 'Menu',

  'lang.label': 'Idioma',
  'currency.label': 'Moeda',
  'currency.reference': 'referencial',
  'currency.note':
    'Guaranis e reais são uma conversão referencial a taxa fixa; a operação é fechada em dólares.',

  'cta.catalog': 'Ver catálogo',
  'cta.build': 'Monte seu PC',
  'cta.add': 'Adicionar ao carrinho',
  'cta.added': 'Adicionado',
  'cta.view': 'Ver',
  'cta.viewAll': 'Ver todo o catálogo',
  'cta.whatsapp': 'Falar no WhatsApp',
  'cta.buyWhatsapp': 'Comprar pelo WhatsApp',
  'cta.backToStore': 'Voltar à loja',
  'cta.reviewCart': 'Revisar o carrinho',
  'cta.close': 'Fechar',
  'cta.undo': 'Desfazer',

  'home.hero.eyebrow': 'Ciudad del Este · Paraguai',
  'home.hero.title1': 'Cada peça',
  'home.hero.title2': 'com a ficha',
  'home.hero.title3': 'na frente.',
  'home.hero.lede':
    'Importamos componentes para montar, melhorar e personalizar computadores. Publicamos soquete, potência e milímetros antes do preço, para você saber se a peça cabe antes de perguntar quanto custa.',
  'home.hero.figureAlt':
    'Render técnico de uma placa de vídeo de três ventiladores com as cotas de comprimento e altura anotadas.',

  'home.manifest.pieces': 'Peças no catálogo',
  'home.manifest.categories': 'Categorias',
  'home.manifest.currencies': 'Moedas',
  'home.manifest.check': 'Compatibilidade',
  'home.manifest.checkValue': 'Verificada',

  'home.categories.eyebrow': 'Índice',
  'home.categories.title': 'O que cada peça decide',
  'home.categories.lede':
    'Uma montagem quebra sempre no mesmo ponto: uma peça que não cabe na outra. Esta é a ordem em que convém decidir.',
  'home.categories.count': 'peças',

  'home.featured.eyebrow': 'Seleção',
  'home.featured.title': 'O que está saindo',
  'home.featured.lede':
    'As peças com mais saída no mês, com a ficha completa e o código de referência.',

  'home.builder.eyebrow': 'Ferramenta',
  'home.builder.title': 'Monte seu PC e confirme que tudo cabe',
  'home.builder.lede':
    'Escolha processador, placa, memória, vídeo, fonte, refrigeração e gabinete. O configurador compara soquetes, geração de memória, potência e milímetros, e avisa em português claro o que não encaixa.',
  'home.builder.cta': 'Abrir o configurador',

  'home.guides.eyebrow': 'Como escolher',
  'home.guides.title': 'Quatro decisões que definem a montagem',
  'home.guides.lede':
    'Não é uma lista de recomendações. É a ordem real em que uma peça condiciona a seguinte.',

  'home.how.eyebrow': 'Como comprar',
  'home.how.title': 'Três passos e pronto',
  'home.how1.title': 'Você escolhe as peças',
  'home.how1.body':
    'Cada ficha traz soquete, potência e milímetros. O configurador avisa se algo não encaixa antes de você adicionar, não depois.',
  'home.how2.title': 'Envia o pedido pelo WhatsApp',
  'home.how2.body':
    'A mensagem se monta sozinha com o que você escolheu e seus dados de entrega. Não pedimos dados de cartão em nenhuma tela.',
  'home.how3.title': 'Fechamos pelo chat',
  'home.how3.body':
    'Confirmamos a disponibilidade, combinamos o envio conforme o destino e acertamos o pagamento e a entrega. Só então você paga.',
  'home.benefits.eyebrow': 'Como trabalhamos',
  'home.benefits.title': 'O que podemos afirmar',
  'home.benefit1.title': 'Ficha técnica completa em cada peça',
  'home.benefit1.body':
    'Soquete, geração de memória, consumo, fonte recomendada e comprimento em milímetros. Verificados contra a ficha do fabricante antes de publicar.',
  'home.benefit2.title': 'Compatibilidade verificável antes de comprar',
  'home.benefit2.body':
    'O configurador compara as peças entre si e explica o problema em linguagem simples. São verificações fundamentais, não uma validação exaustiva.',
  'home.benefit3.title': 'Preço em três moedas e atendimento em dois idiomas',
  'home.benefit3.body':
    'Dólar como referência da operação, guarani e real convertidos a taxa fixa para comparar do outro lado da fronteira. Espanhol e português.',
  'home.benefit4.title': 'A consulta é fechada pelo WhatsApp',
  'home.benefit4.body':
    'O carrinho monta a mensagem com os modelos, as quantidades e os totais. Não há formulários nem contas para criar.',


  "assembly.eyebrow": "Engenharia, camada por camada",
  "assembly.description": "Por fora, uma única peça. Por dentro, um sistema completo. Explore a RTX 5090 Founders Edition: duas ventoinhas, câmara de vapor e 32 GB de GDDR7 ao redor do chip Blackwell.",
  "assembly.memory": "Memória",
  "assembly.bus": "Barramento de memória",
  "assembly.cores": "Núcleos CUDA",
  "assembly.power": "Potência gráfica",
  "assembly.dimensions": "Dimensões",
  "assembly.inquiry": "Olá, equipe da *Sky Import*! 👋\n\nEstive explorando a *GeForce RTX 5090* no site. 🖥️\nPodem me informar quais modelos conseguem, o preço e a disponibilidade?\n\nObrigado! 🙌",
  "assembly.consult": "Consultar sobre a RTX 5090",
  "assembly.catalog": "Ver placas de vídeo do catálogo",
  "assembly.select": "Identificar uma peça da RTX 5090",
  "assembly.all": "Explorar peças",
  "assembly.static": "Vista da placa",
  "assembly.alt": "Recriação de uma RTX 5090 Founders Edition com duas ventoinhas e carcaça metálica",
  'assembly.cta': 'Ver a ficha completa',
  "assembly.note": "Recriação 3D ilustrativa da Founders Edition. Design interno aproximado. Preço, modelo disponível e estoque são confirmados pelo WhatsApp.",
  'assembly.hint': 'Role para desmontar e montar novamente',
  'assembly.closed': 'Montada',
  'assembly.open': 'Desmontada',

  'catalog.title': 'Catálogo',
  'catalog.eyebrow': 'Manifesto de peças',
  'catalog.lede':
    'Todo o estoque, com ficha e código. Filtre pelo que realmente decide: categoria, marca, preço e disponibilidade.',
  'catalog.search': 'Buscar por modelo, marca ou código',
  'catalog.searchLabel': 'Buscar no catálogo',
  'catalog.results': 'peças',
  'catalog.result': 'peça',
  'catalog.filters': 'Filtros',
  'catalog.openFilters': 'Filtrar e ordenar',
  'catalog.applyFilters': 'Ver resultados',
  'catalog.reset': 'Limpar filtros',
  'catalog.category': 'Categoria',
  'catalog.brand': 'Marca',
  'catalog.price': 'Preço máximo',
  'catalog.availability': 'Disponibilidade',
  'catalog.onlyAvailable': 'Somente o que está em estoque',
  'catalog.sort': 'Ordenar',
  'catalog.sort.relevance': 'Sugerido',
  'catalog.sort.priceAsc': 'Preço: do menor ao maior',
  'catalog.sort.priceDesc': 'Preço: do maior ao menor',
  'catalog.sort.name': 'Nome A–Z',
  'catalog.empty.title': 'Nenhuma peça corresponde',
  'catalog.empty.body': 'Tente com menos filtros, ou busque pelo código de referência.',
  'catalog.all': 'Todas',
  'catalog.activeFilters': 'Filtros ativos',

  'product.ref': 'Referência',
  'product.specs': 'Ficha técnica',
  'product.compat': 'O que esta peça condiciona',
  'product.related': 'Da mesma categoria',
  'product.qty': 'Quantidade',
  'product.decrease': 'Remover uma unidade',
  'product.increase': 'Somar uma unidade',
  'product.gallery.front': 'Vista frontal',
  'product.gallery.annotated': 'Vista com cotas',
  'product.gallery.hint': 'Passe o cursor para ver as cotas',
  'product.priceNote':
    'Preço e disponibilidade são dados desta loja, não informação oficial do fabricante.',
  'product.specsNote':
    'Especificações verificadas contra a ficha do fabricante. Os dados comerciais são nossos.',
  'product.availability.disponible': 'Em estoque',
  'product.availability.ultimas-unidades': 'Últimas unidades',
  'product.availability.agotado': 'Sem estoque',
  'product.units': 'unidades',
  'product.unit': 'unidade',
  'product.tag.new': 'Chegada recente',
  'product.tag.off': 'menos',
  'product.was': 'antes',
  'product.notFound': 'Essa peça não está no catálogo',
  'product.notFoundBody': 'Pode ter mudado de código. Procure no catálogo completo.',
  'product.addedToCart': 'adicionado ao carrinho',
  'product.soldOut': 'Sem estoque — fale no WhatsApp',
  'product.soldOutNote':
    'Esta peça está sem unidades no momento. Fale conosco e avisamos assim que chegar.',

  'build.title': 'Monte seu PC',
  'build.eyebrow': 'Painel de compatibilidade',
  'build.lede':
    'Escolha uma peça por slot. Conforme você escolhe, o painel compara soquetes, geração de memória, potência e milímetros.',
  'build.slot.cpu': 'Processador',
  'build.slot.motherboard': 'Placa-mãe',
  'build.slot.ram': 'Memória RAM',
  'build.slot.gpu': 'Placa de vídeo',
  'build.slot.storage': 'Armazenamento',
  'build.slot.psu': 'Fonte',
  'build.slot.cooling': 'Refrigeração',
  'build.slot.case': 'Gabinete',
  'build.choose': 'Escolher',
  'build.change': 'Trocar',
  'build.clearSlot': 'Remover',
  'build.empty': 'Sem escolha',
  'build.status.vacio': 'Escolha a primeira peça',
  'build.status.ok': 'Tudo o que foi verificado encaixa',
  'build.status.aviso': 'Há algo para revisar',
  'build.status.bloqueo': 'Há peças que não encaixam',
  'build.issues': 'Avisos',
  'build.noIssues': 'Sem avisos por enquanto.',
  'build.draw': 'Consumo estimado',
  'build.suggestedPsu': 'Fonte sugerida',
  'build.total': 'Total da montagem',
  'build.addAll': 'Adicionar a montagem ao carrinho',
  'build.reset': 'Limpar a montagem',
  'build.scene.eyebrow': 'Montagem 3D ao vivo',
  'build.scene.title': 'Veja cada peça encontrar o seu lugar',
  'build.scene.idle': 'Chassi em espera',
  'build.scene.assembling': 'Montagem em andamento',
  'build.scene.ready': 'Pronto para testar',
  'build.scene.checking': 'Verificando energia e compatibilidade',
  'build.scene.checkingShort': 'Verificando',
  'build.scene.failed': 'Não foi possível ligar',
  'build.scene.blocked': 'Inicialização bloqueada',
  'build.scene.powered': 'Sistema ligado',
  'build.scene.power': 'Ligar o PC',
  'build.scene.powerOff': 'Desligar o PC',
  'build.scene.retry': 'Testar novamente',
  'build.scene.hint': 'Escolha a próxima peça: ela entrará no gabinete e será montada diante de você.',
  'build.scene.powerHint': 'As oito peças estão montadas. Ligue o PC para verificar energia e compatibilidade.',
  'build.scene.checkingHint': 'Verificando soquete, memória, espaço físico e capacidade da fonte.',
  'build.scene.failedHint': 'Troque as peças indicadas e teste a inicialização novamente.',
  'build.scene.readyHint': 'RGB ativo, ventoinhas girando e pulsos de energia percorrendo os cabos.',
  'build.scene.diagnostic': 'Diagnóstico de inicialização',
  'build.scene.compatibleOptions': 'Ver opções compatíveis',
  'build.scene.purchase': 'Comprar montagem',
  'build.scene.purchaseHint': 'Preço especial pelo conjunto',
  'build.scene.approx': 'Representação 3D aproximada; a foto real identifica o produto escolhido.',
  'build.option.compatible': 'Compatível com a sua montagem',
  'build.option.conflict': 'Exige outra alteração',
  'build.disclaimer':
    'São verificações fundamentais, não uma validação exaustiva de todas as combinações possíveis. Não verificamos perfis de memória validados pela placa, altura dos dissipadores da RAM nem versões de BIOS.',
  'build.pickTitle': 'Escolher',
  'build.pickEmpty': 'Não há peças desta categoria no catálogo.',
  'build.addedAll': 'Montagem adicionada ao carrinho',
  'build.level.bloqueo': 'Não encaixa',
  'build.level.aviso': 'Revisar',
  'build.level.nota': 'Nota',

  'cart.title': 'Carrinho',
  'cart.empty.title': 'O carrinho está vazio',
  'cart.empty.body': 'Comece pelo catálogo, ou monte o equipamento completo no configurador.',
  'cart.subtotal': 'Subtotal',
  'cart.shipping': 'Envio',
  'cart.shipping.toArrange': 'Combinado pelo WhatsApp',
  'cart.shipping.pickup': 'Você retira na loja',
  'cart.shipping.note':
    'O custo do frete depende do peso e do destino. Fechamos com você na conversa, antes de pagar qualquer coisa.',
  'checkout.totalWithoutShipping': 'Total das peças',
  'wa.fabLabel': 'Fale conosco pelo WhatsApp',
  'wa.fabMessage': 'Olá, equipe da *Sky Import*! 👋\nEstava olhando os componentes e quero dar um upgrade no meu PC. 💻\nPodem me ajudar a escolher as peças?',
  'cart.total': 'Total',
  'cart.remove': 'Remover',
  'cart.removed': 'removido do carrinho',
  'cart.clear': 'Esvaziar o carrinho',
  'cart.cleared': 'Carrinho esvaziado',
  'cart.checkout': 'Finalizar compra',
  'cart.continue': 'Continuar comprando',
  'cart.lines': 'itens',
  'cart.line': 'item',
  'cart.loading': 'Carregando o carrinho',

  'checkout.title': 'Finalizar compra',
  'checkout.lede':
    'Preencha seus dados e enviamos o pedido montado pelo WhatsApp. Lá confirmamos a disponibilidade e combinamos o pagamento e a entrega.',
  'checkout.orderSummary': 'Seu pedido',

  'checkout.section.contact': 'Seus dados',
  'checkout.firstName': 'Nome',
  'checkout.lastName': 'Sobrenome',
  'checkout.phone': 'Telefone de contato',
  'checkout.phoneHint': 'É o número pelo qual falamos com você no WhatsApp.',

  'checkout.section.delivery': 'Entrega',
  'checkout.zone': 'Cidade ou região',
  'checkout.address': 'Endereço exato',
  'checkout.addressPlaceholder': 'Rua, número, bairro e um ponto de referência',
  'checkout.notes': 'Observações do pedido',
  'checkout.notesPlaceholder': 'Horário em que você está, referências para chegar, o que for útil.',
  'checkout.notesOptional': 'Opcional',

  'checkout.section.coupon': 'Cupom de desconto',
  'checkout.couponLabel': 'Código do cupom',
  'checkout.couponPlaceholder': 'Código',
  'checkout.couponApply': 'Aplicar',
  'checkout.couponApplied': 'Cupom aplicado',
  'checkout.couponRemove': 'Remover',
  'checkout.coupon.not_found': 'Esse código não existe.',
  'checkout.coupon.inactive': 'Esse cupom não está mais ativo.',
  'checkout.coupon.expired': 'Esse cupom venceu.',
  'checkout.coupon.not_started': 'Esse cupom ainda não começou a valer.',
  'checkout.coupon.exhausted': 'Esse cupom já chegou ao limite de usos.',
  'checkout.coupon.below_minimum': 'Seu pedido não atinge o mínimo exigido por esse cupom.',
  'checkout.coupon.offline': 'Não conseguimos verificar o cupom. Tente de novo em instantes.',

  'checkout.send': 'Enviar pedido pelo WhatsApp',
  'checkout.sending': 'Preparando o pedido',
  'checkout.required': 'Preencha nome, sobrenome e telefone para continuar.',
  'checkout.addressRequired': 'Para esta região precisamos do endereço exato.',
  'checkout.failed': 'Não conseguimos registrar o pedido. Tente de novo ou fale direto conosco.',
  'checkout.howItWorks':
    'O pedido é fechado pelo WhatsApp: não pedimos dados de cartão nesta tela. Ao enviar, a conversa abre com todo o detalhe já escrito.',
  'checkout.emptyTitle': 'Não há nada para finalizar',
  'checkout.emptyBody': 'Adicione pelo menos uma peça ao carrinho para continuar.',

  'guides.title': 'Guias',
  'guides.eyebrow': 'Como escolher',
  'guides.lede':
    'Quatro decisões, na ordem em que uma condiciona a seguinte. Sem recomendações de modelo: critérios.',
  'guides.read': 'Ler',
  'guides.back': 'Voltar aos guias',
  'guides.notFound': 'Esse guia não existe',

  'footer.rights': 'Todos os direitos reservados.',
  'footer.explore': 'Loja',
  'footer.help': 'Como escolher',
  'footer.contact': 'Contato',
  'footer.legal': 'Preços e disponibilidade',
  'footer.legalNote':
    'Os preços estão expressos em dólares norte-americanos. As conversões para guaranis e reais são referenciais, a taxa fixa, e não constituem cotação. A disponibilidade pode mudar sem aviso.',
  'footer.whatsapp': 'Fale conosco',

  'notFound.title': 'Este endereço não existe',
  'notFound.body': 'Talvez a peça tenha mudado de código ou o link esteja cortado.',
  'error.title': 'Algo quebrou deste lado',
  'error.body': 'Recarregue a página. Se acontecer de novo, escreva para nós.',
  'error.retry': 'Tentar de novo',

  'intro.skip': 'Pular',
  'intro.label': 'Sky Import — animação de entrada',

  'wa.productMessage': 'Olá, equipe da *Sky Import*! 👋 Gostaria de consultar a disponibilidade de',
  'wa.cartIntro': 'Olá, quero consultar sobre este pedido:',
  'wa.cartTotal': 'Total',
  'wa.generic': 'Olá, equipe da *Sky Import*! 👋\nEstava olhando os componentes e quero dar um upgrade no meu PC. 💻\nPodem me ajudar a escolher as peças?',
}

export const DICTIONARY: Record<Locale, Record<DictKey, string>> = { es, pt }

export type Translate = (key: DictKey, vars?: Record<string, string>) => string

export function makeT(locale: Locale): Translate {
  const table = DICTIONARY[locale]
  return (key, vars) => {
    const raw = table[key]
    if (!vars) return raw
    return Object.entries(vars).reduce(
      (text, [name, value]) => text.split(`{${name}}`).join(value),
      raw,
    )
  }
}

/**
 * Las vistas por requisito que pide la cátedra. Cada ficha declara solo lo que
 * le aplica: la autenticación no lleva componentes porque no aporta nada verlos,
 * y el catálogo sí, porque la pregunta «qué componente muestra el catálogo» es
 * justamente la que hay que contestar.
 *
 * Los pasos de cada secuencia son los del sistema real, no una idealización:
 * se corresponden con las postcondiciones declaradas en el apartado 3.2.
 */

import { ficha } from './fichas-uml.mjs'

const FICHAS = [
  {
    id: 'RF01',
    nombre: 'Autenticación del administrador',
    resumen:
      'Quién entra al panel y qué comprueba el sistema antes de dejarlo pasar. No lleva vista de componentes: la función no se explica mejor con ellos.',
    actor: { nombre: 'Administrador', nota: 'y también el moderador', paleta: 'admin' },
    casos: ['Iniciar sesión en el panel'],
    participantes: ['Operador', 'Pantalla de acceso', 'Servidor', 'Autenticación', 'admin_users'],
    mensajes: [
      { de: 0, a: 1, texto: 'escribe usuario y contraseña' },
      { de: 1, a: 2, texto: 'signIn(usuario, contraseña)' },
      { de: 2, a: 2, texto: 'traduce el usuario a su correo interno' },
      { de: 2, a: 3, texto: 'verifica la contraseña' },
      { de: 3, a: 2, texto: 'sesión válida y rol del metadato', tipo: 'respuesta' },
      { de: 2, a: 4, texto: '¿pertenece al panel y sigue vigente?' },
      { de: 4, a: 2, texto: 'fila con revoked_at', tipo: 'respuesta' },
      { de: 2, a: 1, texto: 'entra, o el motivo del rechazo', tipo: 'respuesta' },
    ],
    componentes: null,
    nota: 'La contraseña nunca llega al servidor de la tienda: viaja al servicio de autenticación y vuelve una sesión. Un acceso retirado se rechaza acá aunque la contraseña siga siendo correcta.',
  },
  {
    id: 'RF02',
    nombre: 'Consulta y filtrado del catálogo',
    resumen:
      'Quién ve el catálogo, cómo se comporta el sistema cuando lo filtran y de qué partes se sirve.',
    actor: { nombre: 'Cliente', nota: 'sin cuenta ni registro', paleta: 'cliente' },
    casos: ['Consultar el catálogo', 'Filtrar por marca y precio'],
    participantes: ['Cliente', 'Vitrina', 'Servidor', 'products'],
    mensajes: [
      { de: 0, a: 1, texto: 'abre el catálogo' },
      { de: 1, a: 2, texto: 'pide la página' },
      { de: 2, a: 3, texto: 'lee las piezas activas' },
      { de: 3, a: 2, texto: 'fichas, precios y existencias', tipo: 'respuesta' },
      { de: 2, a: 1, texto: 'página ya generada', tipo: 'respuesta' },
      { de: 0, a: 1, texto: 'aplica filtros' },
      { de: 1, a: 1, texto: 'filtra en el navegador y escribe la URL' },
      { de: 1, a: 0, texto: 'resultados, sin recargar la página', tipo: 'respuesta' },
    ],
    componentes: ['Catálogo', 'Filtros y búsqueda', 'Conversión de moneda'],
    nota: 'Las páginas del catálogo se generan de antemano, así que la primera consulta no espera a la base. El filtrado ocurre en el navegador y queda escrito en la dirección, de modo que un filtro se puede compartir por enlace.',
  },
  {
    id: 'RF06',
    nombre: 'Gestión del carrito de compras',
    resumen: 'Quién arma el carrito y qué hace el sistema para que sobreviva a cerrar el navegador.',
    actor: { nombre: 'Cliente', nota: 'sin cuenta ni registro', paleta: 'cliente' },
    casos: ['Agregar una pieza', 'Cambiar cantidades', 'Quitar una línea'],
    participantes: ['Cliente', 'Ficha de producto', 'Carrito', 'Almacenamiento local'],
    mensajes: [
      { de: 0, a: 1, texto: 'elige variante y cantidad' },
      { de: 1, a: 2, texto: 'agrega la línea' },
      { de: 2, a: 2, texto: 'suma el subtotal en dólares' },
      { de: 2, a: 3, texto: 'guarda el estado' },
      { de: 2, a: 0, texto: 'contador y subtotal al día', tipo: 'respuesta' },
    ],
    componentes: null,
    nota: 'El carrito vive únicamente en el navegador del cliente: el sistema no guarda carritos ajenos ni necesita que nadie se registre para tener uno.',
  },
  {
    id: 'RF10',
    nombre: 'Registro del pedido',
    resumen:
      'Quién registra el pedido y qué hace la base para que dos clientes no se lleven la misma unidad.',
    actor: { nombre: 'Cliente', nota: 'sin cuenta ni registro', paleta: 'cliente' },
    casos: ['Registrar el pedido'],
    participantes: ['Cliente', 'Checkout', 'Base de datos', 'orders'],
    mensajes: [
      { de: 0, a: 1, texto: 'confirma sus datos de entrega' },
      { de: 1, a: 2, texto: 'place_order(líneas, cliente, destino, cupón)' },
      { de: 2, a: 2, texto: 'relee el precio vigente de cada pieza' },
      { de: 2, a: 2, texto: 'bloquea las filas y comprueba existencias' },
      { de: 2, a: 3, texto: 'graba el pedido y sus líneas' },
      { de: 3, a: 2, texto: 'número correlativo asignado', tipo: 'respuesta' },
      { de: 2, a: 1, texto: 'número de pedido, o la pieza que faltó', tipo: 'respuesta' },
    ],
    componentes: ['Checkout', 'Funciones transaccionales', 'Control de existencias'],
    nota: 'El cliente transmite identificadores y cantidades, nunca importes: los precios se releen del catálogo dentro de la transacción. Si una pieza no alcanza, no se graba nada.',
  },
  {
    id: 'RF11',
    nombre: 'Generación del mensaje y cierre por WhatsApp',
    resumen: 'Quién cierra la venta y por qué el sistema no envía el mensaje en nombre del cliente.',
    actor: { nombre: 'Cliente', nota: 'sin cuenta ni registro', paleta: 'cliente' },
    casos: ['Generar el mensaje', 'Abrir la conversación'],
    participantes: ['Cliente', 'Checkout', 'Redactor', 'WhatsApp'],
    mensajes: [
      { de: 1, a: 2, texto: 'pide el texto del pedido' },
      { de: 2, a: 2, texto: 'convierte con la tasa grabada en el pedido' },
      { de: 2, a: 1, texto: 'mensaje y enlace oficial', tipo: 'respuesta' },
      { de: 1, a: 0, texto: 'botón listo para abrir la conversación', tipo: 'respuesta' },
      { de: 0, a: 3, texto: 'el propio cliente abre y envía' },
    ],
    componentes: ['Redactor de mensajes', 'Conversión de moneda'],
    nota: 'El sistema prepara el texto y el enlace; el envío lo hace la persona. Se usa la dirección oficial de WhatsApp y no el atajo wa.me, porque este último altera los emojis al redirigir.',
  },
  {
    id: 'RF17',
    nombre: 'Alta de cuentas de administración',
    resumen:
      'Quién puede crear cuentas del panel y qué comprueba el servidor antes de crear ninguna identidad.',
    actor: { nombre: 'Moderador', nota: 'titular · usuario «Cielo»', paleta: 'moderador' },
    casos: ['Crear una cuenta de administrador'],
    participantes: ['Moderador', 'Configuración', 'Servidor', 'Autenticación', 'admin_users'],
    mensajes: [
      { de: 0, a: 1, texto: 'usuario, nombre y contraseña' },
      { de: 1, a: 2, texto: 'createPanelAccount()' },
      { de: 2, a: 2, texto: 'exige rol de moderador antes de seguir' },
      { de: 2, a: 4, texto: '¿ese usuario ya existe?' },
      { de: 2, a: 3, texto: 'crea la identidad con rol administrador' },
      { de: 3, a: 2, texto: 'identidad creada', tipo: 'respuesta' },
      { de: 2, a: 4, texto: 'registra la pertenencia al panel' },
      { de: 2, a: 1, texto: 'alta confirmada', tipo: 'respuesta' },
    ],
    componentes: ['Gestión de cuentas', 'Autenticación', 'Guardia de sesión y rol'],
    nota: 'El formulario no decide el rol: toda cuenta creada desde el panel nace como administrador. Si la pertenencia no llega a registrarse, se elimina la identidad recién creada para no dejar una cuenta huérfana.',
  },
]

for (const f of FICHAS) console.log('  ' + ficha(f))
console.log(`\n${FICHAS.length} fichas generadas en docs/srs/`)

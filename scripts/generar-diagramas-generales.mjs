import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Figuras 24–27. Ancho 1000 px y texto mínimo 20 px:
// a 480 pt en Word, la tipografía mínima equivale a 9,6 pt.
// Figura 24 tiene dos vistas para conservar el tamaño de lectura.
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'srs')
const C = { ink: '#182431', muted: '#4c5c6b', line: '#65788b', blue: '#285a82', pale: '#edf4fa', green: '#285a43', paleGreen: '#edf5ef', gold: '#845c26', paleGold: '#faf2e6', rule: '#b8c7d4' }
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const text = (x, y, lines, size = 20, color = C.ink, anchor = 'start', weight = 400) => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${(Array.isArray(lines) ? lines : [lines]).map((s,i) => `<tspan x="${x}" dy="${i ? size * 1.25 : 0}">${esc(s)}</tspan>`).join('')}</text>`
const rect = (x,y,w,h,fill='#fff',stroke=C.rule,r=8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
const path = (d,color=C.line,dash=false,marker='') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2"${dash?' stroke-dasharray="7 5"':''}${marker?` marker-end="url(#${marker})"`:''}/>`
const defs = `<defs><marker id="arrow" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto"><path d="M1,1 L11,5 L1,9" fill="none" stroke="${C.line}" stroke-width="1.5"/></marker><marker id="solid" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto"><path d="M1,1 L11,5 L1,9 Z" fill="${C.ink}"/></marker><marker id="general" markerWidth="16" markerHeight="14" refX="15" refY="7" orient="auto"><path d="M1,1 L15,7 L1,13 Z" fill="white" stroke="${C.line}" stroke-width="1.6"/></marker></defs>`
const svg = (h,title,subtitle,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${h}" viewBox="0 0 1000 ${h}" font-family="Segoe UI, Arial, sans-serif">${defs}<rect width="1000" height="${h}" fill="white"/>${text(40,43,title,28,C.ink,'start',700)}${text(40,76,subtitle,20,C.muted)}${body}</svg>`
const save = (name,data) => { writeFileSync(join(out,`${name}.svg`),data); console.log(name) }
const actor = (x,y,label,color=C.blue) => `<g fill="none" stroke="${color}" stroke-width="3"><circle cx="${x}" cy="${y}" r="18"/><path d="M${x} ${y+18}v54 M${x-32} ${y+40}h64 M${x} ${y+72}l-28 42 M${x} ${y+72}l28 42"/></g>${text(x,y+144,label,22,color,'middle',700)}`
const usecase = (cx,cy,w,label,color=C.blue) => `<ellipse cx="${cx}" cy="${cy}" rx="${w/2}" ry="29" fill="white" stroke="${color}" stroke-width="2"/>${text(cx,cy+7,label,20,color,'middle')}`

// Figura 24a: asociaciones simples. No se usa include: el resultado del
// registro es condicional y la compra directa no registra un pedido.
const publicCases = ['RF02 · Consultar y filtrar catálogo','RF03 · Buscar productos','RF04 · Elegir variante','RF05 · Comprar una pieza por WhatsApp','RF06 · Gestionar carrito','RF07 · Verificar compatibilidad','RF08 · Ver precios en tres monedas','RF09 · Aplicar cupón','RF10 · Registrar pedido del checkout','RF11 · Generar mensaje del pedido']
let body = rect(230,106,625,825,C.pale,C.blue) + text(542,139,'TIENDA PÚBLICA',20,C.blue,'middle',700)
publicCases.forEach((label,i) => { const y=180+i*75; body += path(`M132 410 L260 ${y}`) + usecase(542,y,560,label) })
body += actor(95,345,'Cliente') + text(95,521,['Sin cuenta','de cliente'],20,C.muted,'middle')
body += rect(430,977,400,82,C.paleGreen,C.green) + text(630,1008,'«sistema externo»',20,C.green,'middle') + text(630,1040,'WhatsApp',24,C.green,'middle',700)
body += path('M822 405 H886 V1001 H830',C.green) + path('M822 855 H916 V1036 H830',C.green)
body += text(40,1102,'RFnn identifica el requisito. Las líneas expresan participación del actor.',20,C.muted)
const publicSvg=svg(1130,'24a · Casos de uso de la tienda','UML · Funciones del cliente y conexión con WhatsApp',body)
save('casos-de-uso-publico',publicSvg)

// Figura 24b: el moderador hereda las funciones de administrador.
const adminCases=['RF01 · Iniciar sesión','RF19 · Cambiar contraseña propia','RF12 · Administrar productos y variantes','RF13 · Controlar existencias','RF14 · Configurar precios y tasa','RF15 · Administrar cupones','RF16 · Seguir pedidos']
const modCases=['RF17 · Crear cuentas del panel','RF18 · Retirar y devolver acceso','RF20 · Dar de baja pedidos','RF21 · Restablecer contraseña ajena']
body=rect(250,106,705,934,'#f8fafc',C.ink)+text(602,140,'PANEL SKY IMPORT',20,C.ink,'middle',700)
adminCases.forEach((label,i)=>{const y=185+i*64; body+=path(`M137 337 L290 ${y}`,C.gold)+usecase(605,y,630,label,C.gold)})
modCases.forEach((label,i)=>{const y=734+i*76;body+=path(`M137 833 L290 ${y}`,C.green)+usecase(605,y,630,label,C.green)})
body+=path('M268 640 H936',C.rule,true)+text(605,677,'FUNCIONES EXCLUSIVAS DEL MODERADOR',20,C.green,'middle',700)
body+=actor(100,270,'Administrador',C.gold)+actor(100,766,'Moderador',C.green)
body+=path('M100 742 V463',C.line,false,'general')+text(118,535,['Hereda','funciones'],20,C.muted)
body+=text(40,1081,['Triángulo hueco: generalización. Las operaciones reservadas exigen el rol', 'en el servidor; la baja de pedidos también se restringe en la base de datos.'],20,C.muted)
const panelSvg=svg(1130,'24b · Casos de uso del panel','UML · Administrador y especialización de Moderador',body)
save('casos-de-uso-panel',panelSvg)
// Se mantiene la ruta histórica como primera vista; el documento inserta
// explícitamente ambas vistas, conservando el número de figura 24.
save('casos-de-uso',publicSvg)

// Figura 25: nodos y componentes. El checkout llama directamente a la API
// de Supabase; el servidor Next.js atiende renderizado y acciones del panel.
const component=(x,y,w,title,detail,color=C.blue)=>rect(x,y,w,86,'#fff',color)+text(x+16,y+27,'«componente»',20,C.muted)+text(x+16,y+54,title,22,color,'start',700)+text(x+16,y+78,detail,20,C.muted)
body=rect(35,112,435,438,C.pale,C.blue)+rect(530,112,435,438,'#f7f9fb',C.ink)
body+=text(252,144,'NAVEGADOR',23,C.blue,'middle',700)+text(748,144,'SERVIDOR NEXT.JS',23,C.ink,'middle',700)
body+=component(55,167,395,'Vitrina y ficha','Interfaz pública ES/PT')+component(55,263,395,'Carrito y configurador','Estado local y compatibilidad')+component(55,359,395,'Checkout y redactor','Compone el texto de WhatsApp')+component(55,455,395,'Interfaz del panel','Productos, pedidos y cuentas')
body+=component(550,167,395,'Renderizado y catálogo','Lectura pública y revalidación',C.ink)+component(550,263,395,'Sesión y autorización','Supabase Auth + admin_users',C.ink)+component(550,359,395,'Acciones del panel','Validan sesión antes de escribir',C.ink)+component(550,455,395,'Gestión de cuentas','Operaciones del moderador',C.ink)
body+=path('M450 207 H550',C.line,true,'arrow')+path('M450 497 H530',C.line,true,'arrow')
body+=rect(35,736,680,288,C.paleGreen,C.green)+text(375,770,'SUPABASE · SERVICIOS SOBRE HTTPS',23,C.green,'middle',700)
body+=component(55,792,305,'Autenticación','Supabase Auth',C.green)+component(382,792,313,'PostgreSQL','Tablas + políticas RLS',C.green)
body+=rect(55,900,640,101,'#fff',C.green)+text(75,933,'«componente» Funciones de base de datos',22,C.green,'start',700)+text(75,965,['validate_coupon · place_order · delete_order','Precios y stock se validan en la transacción.'],20,C.muted)
body+=rect(765,770,200,147,C.paleGreen,C.green)+text(865,804,['«sistema','externo»'],20,C.green,'middle')+text(865,867,'WhatsApp',24,C.green,'middle',700)
body+=path('M450 398 H480 V660 H375 V736',C.blue,true,'arrow')+text(52,620,['Checkout → API pública','RPC: cupón y pedido'],20,C.blue)
body+=path('M950 550 V685 H565 V736',C.ink,true,'arrow')+text(545,617,['Servidor → Auth y datos','Sesión del operador; servicio','solo en gestión de cuentas.'],20,C.ink)
body+=path('M450 424 H496 V711 H865 V770',C.green,true,'arrow')+text(747,705,'Enlace con texto',20,C.green,'middle')
body+=text(35,1073,['La clave de servicio permanece en el servidor. El navegador usa acceso público', 'sujeto a RLS. Flechas discontinuas: dependencia; no representan tiempos.'],20,C.muted)
save('componentes',svg(1140,'25 · Componentes y lugar de ejecución','UML · Interfaz, servidor y servicios externos',body))

// Figura 26: cuatro participantes; Next.js no redacta el mensaje ni es
// intermediario del RPC del checkout. opt final excluye el resultado bloqueado.
const msg=(a,b,y,label,dash=false,color=C.ink)=>text((a+b)/2,y-12,label,20,color,'middle')+path(`M${a} ${y} H${b}`,color,dash,dash?'arrow':'solid')
const frame=(x,y,w,h,op,guard)=>rect(x,y,w,h,'none',C.line,0)+rect(x,y,60,31,'#f1f4f7',C.line,0)+text(x+12,y+23,op,20,C.ink,'start',700)+text(x+74,y+23,guard,20,C.ink)
body=''
for(const [x,name,detail] of [[95,'Cliente','actor'],[350,'Tienda','navegador'],[700,'Supabase','API + PostgreSQL'],[920,'WhatsApp','externo']]){
 const w = x === 700 ? 190 : 150
 body+=rect(x-w/2,108,w,72,'#f7f9fb',C.rule)+text(x,138,name,22,C.ink,'middle',700)+text(x,164,detail,20,C.muted,'middle')+path(`M${x} 180 V1120`,C.rule,true)
}
body+=msg(95,350,224,'1. Selecciona piezas')+msg(95,350,276,'2. Completa entrega')
body+=frame(262,301,513,141,'opt','[hay código de cupón]')+msg(350,700,368,'3. validate_coupon(código)')+msg(700,350,419,'4. Resultado de validación',true)
body+=msg(350,700,490,'5. place_order(datos y cantidades)')
body+=rect(505,514,450,99,C.paleGreen,C.green)+text(525,543,['Relee precios y comprueba stock.', 'Si procede: descuenta y graba todo.', 'Ante error: revierte la transacción.'],20,C.green)
body+=frame(30,635,745,289,'alt','[registro correcto]')+msg(700,350,693,'6a. Número e importes persistidos',true)
body+=path('M30 719 H775',C.line,true)+text(46,747,'[no disponible]',20,C.gold)+msg(700,350,792,'6b. Bloqueado; no registra',true,C.gold)+msg(350,95,837,'Mostrar error; termina',false,C.gold)
body+=path('M30 853 H775',C.line,true)+text(46,879,'[fallo técnico de registro]',20,C.muted)+path('M350 884 H394 V914 H350',C.ink,false,'solid')+text(420,905,'6c. Sin registro ni número',20,C.ink)
body+=frame(262,949,703,159,'opt','[registrado o sin-registro]')
body+=path('M350 987 H400 V1016 H350',C.ink,false,'solid')+text(430,1005,['7. Redacta con importes persistidos', 'o datos disponibles si no registró.'],20,C.ink)
body+=msg(350,920,1089,'8. Abre el enlace con el mensaje')
body+=text(40,1136,'El cliente decide si envía el mensaje. Abrir WhatsApp no confirma pago ni venta.',20,C.muted)
save('comportamiento',svg(1150,'26 · Secuencia del pedido por checkout','UML · Compra directa de una pieza fuera de esta secuencia',body))

// Figura 27: atributos seleccionados y asociaciones de persistencia.
// Las multiplicidades describen SQL (orders puede no tener líneas a nivel
// de esquema; place_order exige productos). El cupón es referencia sin FK.
const klass=(x,y,name,attrs,color=C.blue)=>rect(x,y,410,156,'#fff',color,0)+`<rect x="${x+1}" y="${y+1}" width="408" height="38" fill="${C.pale}"/>`+text(x+205,y+27,name,23,color,'middle',700)+path(`M${x} ${y+40}H${x+410}`,color)+text(x+15,y+67,attrs,20,C.ink)
const multiplicity=(x,y,s)=>`<rect x="${x-3}" y="${y-17}" width="46" height="20" fill="white"/>`+text(x,y,s,20,C.ink)
body=klass(30,113,'categories',['PK slug','name_es · name_pt','active'])+klass(560,113,'shipping_zones',['PK id · UQ slug','name_es · name_pt','requires_address · active'])
body+=klass(30,315,'products',['PK id · UQ slug / ref','FK category_slug','price_usd · units · active'])+klass(560,315,'orders',['PK id · UQ number','FK? zone_slug · coupon_code?','status · total_usd · fx_pyg','stock_released · created_at'])
body+=klass(30,517,'product_variants',['PK id · FK product_id','UQ sku · price_usd?','units · active'])+klass(560,517,'order_items',['PK id · FK order_id','FK? product_id / variant_id','sku · qty · unit_price_usd','Copia histórica de la pieza'])
body+=klass(30,719,'coupons',['PK id · UQ code','kind · value · active','max_uses? · used_count'])+klass(560,719,'auth.users  «externa»',['PK id','Autenticación de Supabase','app_metadata.panel_role'])
body+=klass(30,921,'settings',['PK key · value','FK? updated_by','updated_at'])+klass(560,921,'admin_users',['PK/FK user_id · UQ username','full_name · revoked_at?','created_at'])
// Asociaciones verticales: cardinalidad junto a cada extremo.
for(const [x,y1,y2,top,bottom] of [[160,269,315,'1','0..*'],[160,471,517,'1','0..*'],[810,269,315,'0..1','0..*'],[810,471,517,'1','0..*'],[810,875,921,'1','0..1']]){
 body+=path(`M${x} ${y1}V${y2}`)+multiplicity(x+10,y1+18,top)+multiplicity(x+66,y2-5,bottom)
}
// Producto y variante de una línea pueden quedar NULL tras su eliminación.
body+=path('M440 347 H493 V543 H560')+multiplicity(444,339,'0..1')+multiplicity(513,536,'0..*')
body+=path('M440 610 H560')+multiplicity(444,598,'0..1')+multiplicity(512,598,'0..*')
// Cupón: vínculo por código, sin FK ni borrado en cascada.
body+=path('M440 785 H470 V454 H560',C.gold,true)+multiplicity(444,807,'0..1')+multiplicity(512,447,'0..*')
// Autor opcional de settings. La presencia del campo no garantiza que la
// aplicación lo rellene: se muestra como estructura, no como auditoría.
body+=path('M440 995 H516 V822 H560',C.line)+multiplicity(444,984,'0..*')+multiplicity(513,814,'0..1')
body+=text(30,1112,['PK: primaria · FK: foránea · UQ: única · ?: admite NULL. Cupón: trazo discontinuo.', 'Atributos principales; no es una bitácora. El Apéndice A resume tablas y funciones.'],20,C.muted)
save('clases',svg(1150,'27 · Clases del modelo de datos','UML · Nueve tablas públicas y la identidad externa de Supabase Auth',body))

/** Diagramas de contexto legibles a 480 pt de ancho en el SRS. */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const req = createRequire(process.env.CODEX_NODE_MODULES
  ? join(process.env.CODEX_NODE_MODULES, '__srs__.cjs') : join(root, 'package.json'))
const sharp = req('sharp')
const out = join(root, 'docs', 'srs')
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const text = (x,y,lines,size=22,color='#243746',bold=false) => {
  const a = Array.isArray(lines) ? lines : [lines]
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${color}"${bold?' font-weight="700"':''}>${a.map((l,i)=>`<tspan x="${x}" dy="${i?size*1.3:0}">${esc(l)}</tspan>`).join('')}</text>`
}
const box=(x,y,w,h,lines,{fill='#f4f7fa',stroke='#536775',size=22,bold=false}={}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`+
  text(x+w/2,y+h/2-(lines.length-1)*size*.65+size*.35,lines,size,'#243746',bold)
const arrow=(d,color='#536775')=>`<path d="${d}" stroke="${color}" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>`
const label=(x,y,s,size=20)=>`<rect x="${x-s.length*size*.28-5}" y="${y-size}" width="${s.length*size*.56+10}" height="${size+7}" fill="white"/>${text(x,y,s,size)}`
const start=(w,h,title,subtitle)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial, sans-serif"><rect width="100%" height="100%" fill="white"/><defs><marker id="arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M0 0 L9 3.5 L0 7 Z" fill="#536775"/></marker></defs>${text(w/2,36,title,28,'#111111',true)}${text(w/2,70,subtitle,20)}`

let blocks=start(1000,1040,'Bloques del sistema Sky Import','Funciones, usuarios y servicios externos')
blocks+=box(35,110,290,110,['Cliente','Visita sin cuenta'],{fill:'#eef4fb',bold:true})
blocks+=box(355,110,290,110,['Administrador','Operación de la tienda'],{fill:'#fdf1e3',bold:true})
blocks+=box(675,110,290,110,['Moderador','Administración y cuentas'],{fill:'#eaf3ee',bold:true})
blocks+=arrow('M180 220 L180 286')+arrow('M500 220 L500 286')+arrow('M820 220 L820 255 L530 255 L530 286')
blocks+=`<rect x="20" y="290" width="960" height="412" rx="10" fill="#fafbfc" stroke="#243746" stroke-width="2.5" stroke-dasharray="8 5"/>`
blocks+=text(500,330,'Aplicación web Sky Import',25,'#111111',true)
blocks+=box(40,360,290,275,['Tienda pública','Catálogo y filtros','Ficha y variantes','Configurador y carrito','Checkout y mensaje','ES / PT · USD / PYG / BRL'],{fill:'#eef4fb',size:22})
blocks+=box(355,360,290,275,['Panel en español','Productos y existencias','Tasa, cupones y pedidos','Acceso por sesión y rol','Moderador: cuentas','y baja de pedidos'],{fill:'#fdf1e3',size:22})
blocks+=box(670,360,290,275,['Servicios del servidor','Acciones autorizadas','Validación de sesión','Control de permisos','APIs de Supabase','Operaciones del panel'],{size:22})
blocks+=arrow('M645 490 L669 490')
blocks+=arrow('M185 635 L185 750 L260 750 L260 796')
blocks+=arrow('M815 635 L815 750 L740 750 L740 796')
blocks+=label(500,674,'El navegador compone el mensaje comercial antes de abrir WhatsApp.',21)
blocks+=label(260,738,'Enlace con texto codificado',20)
blocks+=label(740,738,'APIs sobre HTTPS',20)
blocks+=box(40,800,440,165,['WhatsApp','Servicio externo de mensajería','El cliente envía el mensaje.','El vendedor acuerda venta y pago.'],{fill:'#eaf3ee',size:22})
blocks+=box(520,800,440,165,['Supabase','PostgreSQL y nueve tablas públicas','Auth, RLS y funciones SQL','Registro transaccional de pedidos'],{fill:'#eef4fb',size:22})
blocks+=text(500,1008,'El sistema no procesa pagos ni confirma el envío efectivo del mensaje.',21)
blocks+='</svg>'

let flow=start(1000,1260,'Flujo de compra y contacto por WhatsApp','Compra directa y pedido completo desde el checkout')
flow+=`<ellipse cx="500" cy="115" rx="140" ry="28" fill="#eef4fb" stroke="#3a6ea5" stroke-width="2"/>`+text(500,123,'Inicio',23,'#243746',true)
flow+=arrow('M500 143 L500 169')
flow+=box(310,173,380,80,['Abre la ficha y selecciona','variante y cantidad'])
flow+=arrow('M500 253 L500 280')
flow+=`<polygon points="500,282 660,337 500,392 340,337" fill="#fff5e3" stroke="#9a723c" stroke-width="2"/>`+text(500,344,'¿Compra directa?',22)
flow+=arrow('M340 337 L185 337 L185 431')+text(250,323,'Sí',21,'#243746',true)
flow+=box(35,435,300,115,['Prepara mensaje simple','Producto, SKU e importe','Sin registro de pedido'],{fill:'#eaf3ee',size:21})
flow+=arrow('M660 337 L940 337 L940 405 L645 405 L645 431')+text(780,323,'No: carrito y checkout',21)
flow+=box(390,435,510,115,['Completa datos de entrega','Puede aplicar un cupón','Valida los datos antes de continuar'])
flow+=arrow('M645 550 L645 579')
flow+=box(390,583,510,100,['Solicita place_order()','Valida precios, cupón y existencias','Intenta guardar pedido y líneas'],{fill:'#eef4fb',size:22})
flow+=arrow('M645 683 L645 710')
flow+=`<polygon points="645,712 825,777 645,842 465,777" fill="#fff5e3" stroke="#9a723c" stroke-width="2"/>`+text(645,769,['Resultado del','registro'],22)
flow+=arrow('M465 777 L445 777 L445 921')+label(431,881,'Registrado',20)
flow+=arrow('M645 842 L645 921')+label(647,881,'Falta stock',20)
flow+=arrow('M825 777 L875 777 L875 921')+label(878,881,'Fallo técnico',20)
flow+=box(350,925,190,100,['Usa número e','importes del','pedido guardado'],{fill:'#eaf3ee',size:20})
flow+=box(550,925,190,100,['Muestra error','y detiene','el proceso'],{fill:'#fbeae7',size:20})
flow+=box(760,925,230,100,['Continúa sin registro','con los datos','disponibles'],{size:20})
flow+=arrow('M645 1025 L645 1040')
flow+=`<ellipse cx="645" cy="1065" rx="88" ry="23" fill="#fbeae7" stroke="#9b493e" stroke-width="2"/>`+text(645,1072,'Fin',20)
flow+=arrow('M445 1025 L445 1110 L500 1110 L500 1135')
flow+=arrow('M875 1025 L875 1110 L520 1110 L520 1135')
flow+=arrow('M185 550 L185 1174 L316 1174')
flow+=box(320,1139,650,72,['El navegador prepara el enlace a WhatsApp.','El cliente lo abre y envía el mensaje.'],{fill:'#eaf3ee',size:22})
flow+=text(500,1242,'La aplicación no procesa ni confirma el pago de la operación.',21)
flow+='</svg>'

for(const [name,svg] of [['bloques',blocks],['flujo',flow]]) {
  writeFileSync(join(out,name+'.svg'),svg)
  await sharp(Buffer.from(svg),{density:192}).png().toFile(join(out,name+'.png'))
  console.log(`${name}: SVG y PNG actualizados`)
}

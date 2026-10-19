/**
 * Fichas UML de los 21 RF, compuestas para una página A4 vertical.
 * A 480 pt de ancho en Word, la letra mínima de 15 px equivale a 9,47 pt.
 * La legibilidad depende de estas medidas, no de aumentar la resolución PNG.
 */
import { writeFileSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const DIR_FICHAS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'srs')
const W = 760
const X = 18
const PANEL = W - X * 2
const C = {
  tinta: '#14212e', texto: '#263847', suave: '#455c6e', linea: '#bac8d3', fondo: '#f5f8fa',
  cliente: { borde: '#376b9d', relleno: '#edf4fb', texto: '#224c71' },
  admin: { borde: '#956124', relleno: '#faf1e6', texto: '#704716' },
  moderador: { borde: '#34734f', relleno: '#edf6ef', texto: '#27543c' },
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Estimación conservadora de Arial para envolver rótulos antes de dibujar.
function medida(texto, size) {
  return [...texto].reduce((w, c) => w +
    (/[MW@%]/.test(c) ? 0.92 : /[il.,:;!|']/.test(c) ? 0.29 : c === ' ' ? 0.31 :
      /[A-ZÁÉÍÓÚÑ0-9]/.test(c) ? 0.65 : 0.54) * size, 0)
}

function envolver(texto, ancho, size) {
  const lineas = []
  let linea = ''
  for (const palabra of String(texto).split(/\s+/)) {
    const candidata = linea ? `${linea} ${palabra}` : palabra
    if (linea && medida(candidata, size) > ancho) {
      lineas.push(linea)
      linea = palabra
    } else linea = candidata
  }
  if (linea) lineas.push(linea)
  return lineas
}

function texto(lineas, x, y, { size = 16, step = 19, anchor = 'start', color = C.texto, weight = 400 } = {}) {
  if (!Array.isArray(lineas)) lineas = [lineas]
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}">${lineas.map((l, i) => `<tspan x="${x}" dy="${i ? step : 0}">${esc(l)}</tspan>`).join('')}</text>`
}

function marco(y, h, titulo, fondo = '#ffffff') {
  return `<rect x="${X}" y="${y}" width="${PANEL}" height="${h}" rx="6" fill="${fondo}" stroke="${C.linea}"/>` +
    texto(titulo, X + 14, y + 24, { size: 16, weight: 700, color: C.tinta })
}

function casoDeUso(f, y) {
  const p = C[f.actor.paleta]
  const h = Math.max(178, 74 + f.casos.length * 45)
  const ax = X + 104
  const ay = y + 59
  const sx = X + 231
  const sy = y + 34
  const sw = PANEL - 245
  const cy = i => y + 80 + i * 45
  const ecx = sx + sw / 2
  const rx = sw / 2 - 16
  let svg = marco(y, h, 'CASO DE USO · ACTOR Y FUNCIÓN', C.fondo)
  svg += `<rect x="${sx}" y="${sy}" width="${sw}" height="${h - 44}" rx="4" fill="#ffffff" stroke="${C.linea}"/>`
  svg += texto('Sky Import', sx + 10, sy + 19, { size: 15, color: C.suave })
  // Las asociaciones quedan detrás de las elipses y no atraviesan rótulos.
  for (let i = 0; i < f.casos.length; i++)
    svg += `<line x1="${ax + 26}" y1="${ay + 25}" x2="${ecx - rx}" y2="${cy(i)}" stroke="${C.suave}" stroke-width="1.4"/>`
  svg += `<g stroke="${p.borde}" stroke-width="2" fill="none"><circle cx="${ax}" cy="${ay}" r="10" fill="${p.relleno}"/><path d="M${ax} ${ay + 10} v30 m-23,-18 h46 m-23,18 l-18,23 m18,-23 l18,23"/></g>`
  svg += texto(f.actor.nombre, ax, ay + 83, { size: 16, weight: 700, color: p.texto, anchor: 'middle' })
  svg += texto(envolver(f.actor.nota, 205, 15), ax, ay + 103, { size: 15, anchor: 'middle', color: C.suave, step: 17 })
  f.casos.forEach((caso, i) => {
    const lines = envolver(caso, rx * 2 - 26, 16)
    svg += `<ellipse cx="${ecx}" cy="${cy(i)}" rx="${rx}" ry="19" fill="${p.relleno}" stroke="${p.borde}" stroke-width="1.5"/>`
    svg += texto(lines, ecx, cy(i) + 5 - (lines.length - 1) * 9, { size: 16, step: 18, anchor: 'middle', color: p.texto })
  })
  return { svg, h }
}

function secuencia(f, y) {
  const n = f.participantes.length
  const margen = 79
  const paso = (PANEL - 2 * margen) / (n - 1)
  const col = i => X + margen + i * paso
  const cabeceraY = y + 39
  let cursor = y + 103
  const filas = f.mensajes.map((m, i) => {
    const lines = envolver(`${i + 1}. ${m.texto}`, PANEL - 40, 16)
    const labelWidth = Math.max(...lines.map(l => medida(l, 16))) + 10
    const a = col(m.de), b = col(m.a)
    const target = (a + b) / 2
    const center = Math.max(X + 20 + labelWidth / 2, Math.min(X + PANEL - 20 - labelWidth / 2, target))
    const labelY = cursor
    const arrowY = labelY + (lines.length - 1) * 19 + 13
    cursor = arrowY + (m.de === m.a ? 31 : 27)
    return { m, lines, labelWidth, center, labelY, arrowY, a, b }
  })
  const h = cursor - y + 1
  let svg = marco(y, h, 'SECUENCIA · COMPORTAMIENTO DEL SISTEMA')
  f.participantes.forEach((nombre, i) => {
    const bw = Math.min(paso - 9, 146)
    const lines = envolver(nombre, bw - 12, 15)
    svg += `<rect x="${col(i) - bw / 2}" y="${cabeceraY}" width="${bw}" height="44" rx="4" fill="${C.fondo}" stroke="${C.suave}"/>`
    svg += texto(lines, col(i), cabeceraY + 27 - (lines.length - 1) * 9, { size: 15, step: 18, weight: 700, anchor: 'middle' })
    svg += `<line x1="${col(i)}" y1="${cabeceraY + 44}" x2="${col(i)}" y2="${y + h - 12}" stroke="#a8bbc9" stroke-width="1.2" stroke-dasharray="5 5"/>`
  })
  for (const r of filas) {
    const respuesta = r.m.tipo === 'respuesta'
    const marker = respuesta ? 'abierta' : 'llena'
    const color = respuesta ? C.suave : C.texto
    svg += `<rect x="${r.center - r.labelWidth / 2}" y="${r.labelY - 14}" width="${r.labelWidth}" height="${r.lines.length * 19}" rx="2" fill="#ffffff"/>`
    svg += texto(r.lines, r.center, r.labelY, { size: 16, step: 19, anchor: 'middle', color })
    if (r.m.de === r.m.a) {
      const dir = r.a < W / 2 ? 1 : -1
      svg += `<path d="M${r.a} ${r.arrowY} h${dir * 30} v12 h${-dir * 30}" fill="none" stroke="${color}" stroke-width="1.6" marker-end="url(#f-${marker})"/>`
    } else {
      svg += `<line x1="${r.a}" y1="${r.arrowY}" x2="${r.b}" y2="${r.arrowY}" stroke="${color}" stroke-width="1.6"${respuesta ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#f-${marker})"/>`
    }
  }
  return { svg, h }
}

function componentes(f, y) {
  if (!f.componentes?.length) return { svg: '', h: 0 }
  const h = 94
  const gap = 16
  const bw = (PANEL - 40 - gap * (f.componentes.length - 1)) / f.componentes.length
  let svg = marco(y, h, 'COMPONENTES QUE INTERVIENEN', C.fondo)
  f.componentes.forEach((c, i) => {
    const x = X + 20 + i * (bw + gap)
    const lines = envolver(c, bw - 24, 15)
    svg += `<rect x="${x}" y="${y + 36}" width="${bw}" height="46" rx="4" fill="#ffffff" stroke="${C.suave}"/><rect x="${x - 5}" y="${y + 44}" width="10" height="8" fill="#ffffff" stroke="${C.suave}"/><rect x="${x - 5}" y="${y + 62}" width="10" height="8" fill="#ffffff" stroke="${C.suave}"/>`
    svg += texto(lines, x + bw / 2, y + 64 - (lines.length - 1) * 9, { size: 15, step: 18, anchor: 'middle' })
  })
  return { svg, h }
}

export function ficha(f) {
  const title = envolver(f.nombre, W - 127, 22)
  let cursor = 30 + (title.length - 1) * 26 + 19
  const uso = casoDeUso(f, cursor)
  cursor += uso.h + 12
  const sec = secuencia(f, cursor)
  cursor += sec.h + 12
  const comp = componentes(f, cursor)
  if (comp.h) cursor += comp.h + 12
  const note = envolver(f.nota, PANEL - 4, 15)
  const H = cursor + note.length * 18 + 14
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, sans-serif">
  <title>${esc(f.id + ' — ' + f.nombre)}</title><desc>${esc(f.resumen)}</desc>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <defs><marker id="f-llena" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="${C.texto}"/></marker><marker id="f-abierta" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="${C.suave}" stroke-width="1.2"/></marker></defs>
  <rect x="${X}" y="10" width="74" height="30" rx="5" fill="${C.tinta}"/>
  ${texto(f.id, X + 37, 31, { size: 18, anchor: 'middle', color: '#ffffff', weight: 700 })}
  ${texto(title, 106, 31, { size: 22, step: 26, weight: 700, color: C.tinta })}
  ${uso.svg}${sec.svg}${comp.svg}
  ${texto(note, X + 2, cursor + 14, { size: 15, step: 18, color: C.suave })}
  </svg>\n`
  const basename = `rf-${f.id.toLowerCase()}`
  const destino = join(DIR_FICHAS, `${basename}.svg`)
  const temporal = destino + '.tmp'
  writeFileSync(temporal, svg, 'utf8')
  renameSync(temporal, destino)
  return { archivo: `${basename}.svg`, width: W, height: H, minFontPx: 15 }
}

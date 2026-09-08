/**
 * FICHAS UML POR REQUISITO
 *
 * La cátedra pide, para cada función del sistema, las vistas que le apliquen:
 * quién la usa (caso de uso), cómo se comporta (secuencia) y, cuando aporta,
 * de qué partes se sirve (componentes). No todas las funciones necesitan las
 * tres —la autenticación, por ejemplo, no necesita componentes—, así que cada
 * ficha declara solo lo suyo.
 *
 * Se generan a partir de datos y no a mano por una razón práctica: son unas
 * treinta. Dibujadas una por una quedarían desparejas, y corregir el estilo
 * obligaría a rehacerlas todas. Acá se corrige el molde una vez.
 *
 * Cada ficha sale como un SVG en docs/srs/, y `render-diagramas` los descubre
 * solo y los convierte a PNG para el documento.
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'srs')

// La misma paleta de las figuras generales, para que el documento no parezca
// escrito por dos manos distintas.
const C = {
  tinta: '#12181f',
  texto: '#2f3a45',
  suave: '#5b6875',
  tenue: '#7a8794',
  linea: '#c8d2dc',
  fondo: '#f7f9fb',
  cliente: { borde: '#3a6ea5', relleno: '#eef4fb', texto: '#1d3a5c' },
  admin: { borde: '#b5762f', relleno: '#fdf1e3', texto: '#7a4d12' },
  moderador: { borde: '#2c7a54', relleno: '#eaf3ee', texto: '#1f4a35' },
  sistema: { borde: '#5b6875', relleno: '#eef1f4', texto: '#2f3a45' },
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Muñeco de actor, centrado en (x, y) sobre la cabeza. */
function actor(x, y, paleta) {
  return `
    <g stroke="${paleta.borde}" stroke-width="2.2" fill="none">
      <circle cx="${x}" cy="${y}" r="17" fill="${paleta.relleno}"/>
      <line x1="${x}" y1="${y + 17}" x2="${x}" y2="${y + 62}"/>
      <line x1="${x - 28}" y1="${y + 32}" x2="${x + 28}" y2="${y + 32}"/>
      <line x1="${x}" y1="${y + 62}" x2="${x - 22}" y2="${y + 98}"/>
      <line x1="${x}" y1="${y + 62}" x2="${x + 22}" y2="${y + 98}"/>
    </g>`
}

/** Panel izquierdo: quién usa la función. */
function panelCasoDeUso(ficha, x, y, ancho, alto) {
  const p = C[ficha.actor.paleta]
  const cx = x + 78
  const ey = y + 96
  const elipses = ficha.casos
    .map((texto, i) => {
      const cy = ey + i * 62
      return `
      <ellipse cx="${x + ancho - 132}" cy="${cy}" rx="118" ry="26" fill="#ffffff" stroke="${p.borde}" stroke-width="1.8"/>
      <text x="${x + ancho - 132}" y="${cy + 5}" text-anchor="middle" font-size="12.5" fill="${p.texto}">${esc(texto)}</text>
      <line x1="${cx + 30}" y1="${ey + 4}" x2="${x + ancho - 252}" y2="${cy}" stroke="${C.suave}" stroke-width="1.3"/>`
    })
    .join('')

  return `
  <rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="6" fill="${C.fondo}" stroke="${C.linea}" stroke-width="1.4"/>
  <text x="${x + 16}" y="${y + 26}" font-size="12.5" font-weight="700" fill="${C.tinta}" letter-spacing="1.2">CASO DE USO — QUIÉN LA USA</text>
  ${actor(cx, y + 62, p)}
  <text x="${cx}" y="${y + 182}" text-anchor="middle" font-size="13" font-weight="700" fill="${p.texto}">${esc(ficha.actor.nombre)}</text>
  <text x="${cx}" y="${y + 200}" text-anchor="middle" font-size="11.5" fill="${C.suave}">${esc(ficha.actor.nota)}</text>
  ${elipses}`
}

/** Panel derecho: cómo se comporta, como secuencia de mensajes. */
function panelSecuencia(ficha, x, y, ancho, alto) {
  const n = ficha.participantes.length
  const paso = (ancho - 120) / (n - 1)
  const col = (i) => x + 60 + i * paso
  const yTop = y + 44
  const yBase = y + alto - 24

  const cabezas = ficha.participantes
    .map((nombre, i) => {
      const w = Math.min(paso - 16, 168)
      return `
      <rect x="${col(i) - w / 2}" y="${yTop}" width="${w}" height="40" rx="4" fill="#ffffff" stroke="${C.suave}" stroke-width="1.6"/>
      <text x="${col(i)}" y="${yTop + 25}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${C.texto}">${esc(nombre)}</text>
      <line x1="${col(i)}" y1="${yTop + 40}" x2="${col(i)}" y2="${yBase}" stroke="#9dbad6" stroke-width="1.3" stroke-dasharray="6 5"/>`
    })
    .join('')

  let my = yTop + 74
  const mensajes = ficha.mensajes
    .map((m, i) => {
      const a = col(m.de)
      const b = col(m.a)
      const respuesta = m.tipo === 'respuesta'
      const trazo = respuesta ? ' stroke-dasharray="6 4"' : ''
      const marca = respuesta ? 'abierta' : 'llena'
      const color = respuesta ? C.suave : C.texto
      let cuerpo
      if (m.de === m.a) {
        cuerpo = `<path d="M${a} ${my - 10} h38 v22 h-38" fill="none" stroke="${color}" stroke-width="1.5" marker-end="url(#f-${marca})"/>`
      } else {
        const dir = b > a ? -9 : 9
        cuerpo = `<line x1="${a}" y1="${my}" x2="${b + dir}" y2="${my}" stroke="${color}" stroke-width="1.5"${trazo} marker-end="url(#f-${marca})"/>`
      }
      const tx = m.de === m.a ? a + 46 : (a + b) / 2
      const anclaje = m.de === m.a ? 'start' : 'middle'
      const etiqueta = `<text x="${tx}" y="${my - 8}" text-anchor="${anclaje}" font-size="12" fill="${color}">${i + 1}. ${esc(m.texto)}</text>`
      my += m.de === m.a ? 54 : 44
      return cuerpo + etiqueta
    })
    .join('')

  return `
  <rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="6" fill="#ffffff" stroke="${C.linea}" stroke-width="1.4"/>
  <text x="${x + 16}" y="${y + 26}" font-size="12.5" font-weight="700" fill="${C.tinta}" letter-spacing="1.2">COMPORTAMIENTO — CÓMO RESPONDE EL SISTEMA</text>
  ${cabezas}
  ${mensajes}`
}

/** Franja inferior opcional: de qué partes se sirve. */
function panelComponentes(ficha, x, y, ancho) {
  if (!ficha.componentes) return ''
  const cajas = ficha.componentes
    .map((c, i) => {
      const w = (ancho - 32 - 16 * (ficha.componentes.length - 1)) / ficha.componentes.length
      const cx = x + 16 + i * (w + 16)
      return `
      <rect x="${cx}" y="${y + 40}" width="${w}" height="52" rx="4" fill="#ffffff" stroke="${C.suave}" stroke-width="1.5"/>
      <rect x="${cx - 5}" y="${y + 50}" width="10" height="8" fill="#ffffff" stroke="${C.suave}" stroke-width="1.2"/>
      <rect x="${cx - 5}" y="${y + 66}" width="10" height="8" fill="#ffffff" stroke="${C.suave}" stroke-width="1.2"/>
      <text x="${cx + w / 2}" y="${y + 70}" text-anchor="middle" font-size="12.5" fill="${C.texto}">${esc(c)}</text>`
    })
    .join('')
  return `
  <rect x="${x}" y="${y}" width="${ancho}" height="108" rx="6" fill="${C.fondo}" stroke="${C.linea}" stroke-width="1.4"/>
  <text x="${x + 16}" y="${y + 26}" font-size="12.5" font-weight="700" fill="${C.tinta}" letter-spacing="1.2">COMPONENTES QUE INTERVIENEN</text>
  ${cajas}`
}

export function ficha(f) {
  const W = 1460
  const altoSec = 120 + f.mensajes.reduce((a, m) => a + (m.de === m.a ? 54 : 44), 0)
  const altoCu = Math.max(240, 96 + f.casos.length * 62)
  const cuerpo = Math.max(altoSec, altoCu)
  const H = 108 + cuerpo + (f.componentes ? 128 : 0) + 52

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Arial, sans-serif">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <defs>
    <marker id="f-llena" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8 z" fill="${C.texto}"/>
    </marker>
    <marker id="f-abierta" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <path d="M0,0 L10,4 L0,8" fill="none" stroke="${C.suave}" stroke-width="1.4"/>
    </marker>
  </defs>

  <text x="30" y="42" font-size="21" font-weight="700" fill="${C.tinta}">${esc(f.id)} · ${esc(f.nombre)}</text>
  <text x="30" y="68" font-size="13.5" fill="${C.suave}">${esc(f.resumen)}</text>
  <line x1="30" y1="84" x2="${W - 30}" y2="84" stroke="${C.linea}" stroke-width="1.4"/>

  ${panelCasoDeUso(f, 30, 108, 470, cuerpo)}
  ${panelSecuencia(f, 524, 108, W - 554, cuerpo)}
  ${panelComponentes(f, 30, 108 + cuerpo + 20, W - 60)}

  <text x="30" y="${H - 20}" font-size="12" fill="${C.tenue}">${esc(f.nota)}</text>
</svg>
`
  writeFileSync(join(DIR, `rf-${f.id.toLowerCase()}.svg`), svg, 'utf8')
  return `rf-${f.id.toLowerCase()}.svg`
}

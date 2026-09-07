/**
 * MIDE DÓNDE ESTÁ LA PIEZA DENTRO DE SU FOTO
 *
 *   npm run medir -- geforce-rtx-5070-ti-16gb
 *
 * Las fotos del catálogo son cuadradas y con fondo transparente, pero la pieza
 * nunca llena el cuadrado: cada una trae su propio margen. La 5070 Ti ocupa el
 * 75 % central; la 5080, el 84 %.
 *
 * Eso importa para una sola cosa, y es la que hizo falta este archivo: la cota
 * del primer viewport. Una línea de medida que abarca el cuadrado entero es un
 * tercio más larga que la tarjeta —dice «304 mm» y señala aire— y en pantalla
 * canta. Los márgenes que imprime este script son los que `PhotoDims` usa para
 * que el metro empiece y termine donde de verdad empieza y termina la placa.
 *
 * Se corre A MANO, cuando cambia la pieza del héroe, y el resultado se anota
 * en el código. No es un paso de compilación: leer el canal alfa de una imagen
 * de 1600×1600 para un dato que cambia una vez al año no justifica pagarlo en
 * cada `build`.
 */

import sharp from 'sharp'
import { existsSync } from 'node:fs'

const slug = process.argv[2]

if (!slug) {
  console.error('Falta el slug. Ejemplo: npm run medir -- geforce-rtx-5070-ti-16gb')
  process.exit(1)
}

const ruta = `public/products/${slug}/primary.webp`

if (!existsSync(ruta)) {
  console.error(`No existe ${ruta}`)
  process.exit(1)
}

const imagen = sharp(ruta)
const { width, height } = await imagen.metadata()
const pixeles = await imagen.ensureAlpha().raw().toBuffer()

let minX = width
let maxX = -1
let minY = height
let maxY = -1

// Umbral 12 y no 0: los bordes de una foto recortada traen una orla de píxeles
// casi transparentes que no son la pieza y estirarían la medida un punto.
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (pixeles[(y * width + x) * 4 + 3] > 12) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}

const pct = (v) => Number(((v / width) * 100).toFixed(2))

console.log(`\n${slug} — lienzo ${width}×${height}`)
console.log(`  margen izquierdo  ${pct(minX)} %`)
console.log(`  margen derecho    ${pct(width - 1 - maxX)} %`)
console.log(`  margen superior   ${pct(minY)} %`)
console.log(`  margen inferior   ${pct(height - 1 - maxY)} %`)
console.log(`\n  La pieza ocupa el ${pct(maxX - minX + 1)} % del ancho.`)
console.log(`  Para PhotoDims:   trimX={${pct(minX)}}  baseY={${pct(height - 1 - maxY)}}\n`)

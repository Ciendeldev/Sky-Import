import sharp from 'sharp'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Dos carpetas: `docs/srs/` son las figuras del documento, y `docs/presentacion/`
 * el material para proyectar, que no forma parte de la especificación y por eso
 * no se mezcla con ella. Las dos pasan por el mismo convertidor.
 */
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
for (const dir of [join(raiz, 'srs'), join(raiz, 'presentacion')]) {
/**
 * Se descubren solos. Antes la lista estaba escrita a mano y agregar una figura
 * al documento exigía acordarse de tocar también este archivo: el SVG quedaba
 * en la carpeta, el PNG no se generaba y el documento salía con la figura vieja.
 */
  const nombres = readdirSync(dir)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -4))
  .sort()

for (const nombre of nombres) {
  const svg = readFileSync(dir + '\\' + nombre + '.svg')
  const meta = await sharp(svg).metadata()
  await sharp(svg, { density: 144 })
    .resize({ width: Math.round(meta.width * 2) })
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(dir + '\\' + nombre + '.png')
  const out = await sharp(dir + '\\' + nombre + '.png').metadata()
  console.log(nombre + '.png -> ' + out.width + 'x' + out.height)
}
}
